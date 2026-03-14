// combo.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { 
  CreateComboDto, 
  UpdateComboDto, 
  ComboItemDto, 
  ComboItemType,
  OrderComboItemDto,
  CalculateComboPriceDto,
  ComboPriceCalculation
} from './dto/combo.dto';

@Injectable()
export class ComboService {
  constructor(private prisma: PrismaService) {}
async createCombo(dto: CreateComboDto) {
  this.validateComboItems(dto.items);
  await this.validateProductsInItems(dto.items);


  // Создаем комбо в транзакции
  return this.prisma.$transaction(async (tx) => {
    const combo = await tx.product.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        price: dto.price,
        isCombo: true, // ВАЖНО: добавляем это поле
        isUsed: true,
        images: dto.images || [],
        categoryId: dto.categoryId,
        networkId: dto.networkId,
        // Связи через отдельные create для many-to-many
        workshops: dto.workshopIds ? {
          create: dto.workshopIds.map(id => ({
            workshop: { connect: { id } }
          }))
        } : undefined,
        additives: dto.additives ? {
          connect: dto.additives.map(id => ({ id }))
        } : undefined
      }
    });

    // Создаем элементы комбо
    for (const [index, item] of dto.items.entries()) {
      const comboItem = await tx.comboItem.create({
        data: {
          comboId: combo.id,
          type: item.type,
          minSelect: item.minSelect ?? 1,
          maxSelect: item.maxSelect ?? 1,
          groupName: item.groupName,
          sortOrder: item.sortOrder ?? index
        }
      });

      // Создаем продукты для элемента
      if (item.products.length > 0) {
        await tx.comboItemProduct.createMany({
          data: item.products.map((product, pIndex) => ({
            comboItemId: comboItem.id,
            productId: product.productId,
            quantity: product.quantity ?? 1,
            additionalPrice: product.additionalPrice ?? 0,
            allowMultiple: product.allowMultiple ?? false,
            maxQuantity: product.maxQuantity,
            sortOrder: product.sortOrder ?? pIndex
          }))
        });
      }
    }

    return ;
  });
}

async updateCombo(id: string, dto: UpdateComboDto) {
  // Проверяем существование комбо
  await this.getComboById(id);

  return this.prisma.$transaction(async (tx) => {
    // Обновляем основные поля
    if (dto.title || dto.description !== undefined || dto.price !== undefined || dto.images) {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.images && { images: dto.images }),
          ...(dto.categoryId !== undefined && { 
            categoryId: dto.categoryId || null 
          })
        }
      });
    }

    // Обновляем элементы комбо, если они указаны
    if (dto.items) {
      this.validateComboItems(dto.items);
      await this.validateProductsInItems(dto.items);

      // Удаляем старые элементы
      const oldItems = await tx.comboItem.findMany({
        where: { comboId: id },
        select: { id: true }
      });

      if (oldItems.length > 0) {
        await tx.comboItemProduct.deleteMany({
          where: { comboItemId: { in: oldItems.map(i => i.id) } }
        });
        await tx.comboItem.deleteMany({
          where: { comboId: id }
        });
      }

      // Создаем новые элементы
      for (const [index, item] of dto.items.entries()) {
        const comboItem = await tx.comboItem.create({
          data: {
            comboId: id,
            type: item.type,
            minSelect: item.minSelect ?? 1,
            maxSelect: item.maxSelect ?? 1,
            groupName: item.groupName,
            sortOrder: item.sortOrder ?? index
          }
        });

        if (item.products.length > 0) {
          await tx.comboItemProduct.createMany({
            data: item.products.map((product, pIndex) => ({
              comboItemId: comboItem.id,
              productId: product.productId,
              quantity: product.quantity ?? 1,
              additionalPrice: product.additionalPrice ?? 0,
              allowMultiple: product.allowMultiple ?? false,
              maxQuantity: product.maxQuantity,
              sortOrder: product.sortOrder ?? pIndex
            }))
          });
        }
      }
    }

    return this.getComboById(id);
  });
}

  /**
   * Валидация элементов комбо
   */
  private validateComboItems(items: ComboItemDto[]) {
    for (const item of items) {
      if (!item.products || item.products.length === 0) {
        throw new BadRequestException('Каждый элемент комбо должен содержать хотя бы один продукт');
      }

      switch (item.type) {
        case ComboItemType.CHOICE:
          if (item.minSelect > item.maxSelect) {
            throw new BadRequestException('minSelect не может быть больше maxSelect');
          }
          if (item.minSelect < 1) {
            throw new BadRequestException('minSelect должен быть не меньше 1');
          }
          if (item.products.length < item.minSelect) {
            throw new BadRequestException(
              `В группе выбора должно быть минимум ${item.minSelect} продуктов, сейчас ${item.products.length}`
            );
          }
          break;

        case ComboItemType.STATIC:
          // Для статичных элементов проверяем, что суммарное количество продуктов > 0
          const totalQuantity = item.products.reduce((sum, p) => sum + (p.quantity || 1), 0);
          if (totalQuantity === 0) {
            throw new BadRequestException('Статичный элемент должен содержать продукты с количеством > 0');
          }
          break;

        case ComboItemType.OPTIONAL:
          // Опциональные элементы могут быть пустыми, проверять не нужно
          break;
      }

      // Проверяем настройки для продуктов
      for (const product of item.products) {
        if (product.allowMultiple && (!product.maxQuantity || product.maxQuantity < 1)) {
          throw new BadRequestException(
            'Для продуктов с allowMultiple=true необходимо указать maxQuantity > 0'
          );
        }
      }
    }
  }

  /**
   * Проверка существования продуктов в элементах
   */
  private async validateProductsInItems(items: ComboItemDto[]) {
    const allProductIds = items.flatMap(item => 
      item.products.map(p => p.productId)
    );

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: allProductIds },
        isUsed: true,
        isCombo: false // Исключаем комбо из выбора
      }
    });

   

    // Проверяем, что нет циклических зависимостей
    const comboProducts = await this.prisma.product.findMany({
      where: {
        id: { in: allProductIds },
        isCombo: true
      }
    });

    if (comboProducts.length > 0) {
      throw new BadRequestException('Комбо не может содержать другие комбо');
    }
  }

  /**
   * Получение комбо по ID с полной структурой
   */
/**
 * Получение комбо по ID с полной структурой
 */
async getComboById(id: string) {
  const combo = await this.prisma.product.findUnique({
    where: { id, isUsed: true, isCombo: true },
    include: {
      // Правильный путь к comboItems через отношение
      comboItems: {
        include: {
          // Правильный путь к продуктам в комбо
          products: {
            include: {
              // Включаем сам продукт
              product: {
                include: {
                  category: true,
                  restaurantPrices: true
                }
              }
            },
            orderBy: {
              sortOrder: 'asc'
            }
          }
        },
        orderBy: {
          sortOrder: 'asc'
        }
      },
      category: true,
      restaurantPrices: true,
      additives: true,
      // Правильное включение workshops через промежуточную таблицу
      workshops: {
        include: {
          workshop: true
        }
      },
      network: true
    }
  });

  if (!combo) {
    throw new NotFoundException('Комбо не найдено');
  }

  return combo;
}

  /**
   * Получение всех комбо
   */
  async getAllCombos(searchTerm?: string) {
    const where: any = {
      isCombo: true,
      isUsed: true
    };

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        comboItems: {
          include: {
            products: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true
                  }
                }
              }
            }
          }
        },
        category: true,
        restaurantPrices: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Расчет цены комбо на основе выбранных продуктов
   */
  async calculateComboPrice(dto: CalculateComboPriceDto): Promise<ComboPriceCalculation> {
    const combo = await this.getComboById(dto.comboId);
    
    // Валидация выбора
    await this.validateComboSelection(combo, dto.selections);

    let additionalPrice = 0;
    const breakdown = [];

    for (const selection of dto.selections) {
      const comboItem = combo.comboItems.find(item => item.id === selection.comboItemId);
      if (!comboItem) continue;

      const itemBreakdown = {
        itemId: comboItem.id,
        itemName: comboItem.groupName || `Элемент ${comboItem.type}`,
        selectedProducts: []
      };

      for (const selected of selection.selectedProducts) {
        const productInItem = comboItem.products.find(p => p.productId === selected.productId);
        if (!productInItem) continue;

        const productPrice = productInItem.additionalPrice || 0;
        const totalProductPrice = productPrice * selected.quantity;
        additionalPrice += totalProductPrice;

        itemBreakdown.selectedProducts.push({
          productId: selected.productId,
          productName: productInItem.product.title,
          quantity: selected.quantity,
          price: totalProductPrice
        });
      }

      breakdown.push(itemBreakdown);
    }

    return {
      basePrice: combo.price,
      additionalPrice,
      totalPrice: combo.price + additionalPrice,
      breakdown
    };
  }

  /**
   * Валидация выбора продуктов для комбо
   */
  private async validateComboSelection(combo: any, selections: any[]) {
    // Группируем выбор по элементам
    const selectionMap = new Map(
      selections.map(s => [s.comboItemId, s])
    );

    for (const item of combo.comboItems) {
      const selection = selectionMap.get(item.id);

      switch (item.type) {
        case ComboItemType.STATIC:
          // Для статичных элементов проверяем, что выбраны все обязательные продукты
          if (!selection) {
            throw new BadRequestException(
              `Не выбран обязательный элемент: ${item.groupName || 'Статичный элемент'}`
            );
          }

          for (const product of item.products) {
            const selectedProduct = selection.selectedProducts.find(
              (p: any) => p.productId === product.productId
            );

            if (!selectedProduct) {
              throw new BadRequestException(
                `Не выбран обязательный продукт: ${product.product.title}`
              );
            }

            if (selectedProduct.quantity < product.quantity) {
              throw new BadRequestException(
                `Для продукта ${product.product.title} необходимо выбрать минимум ${product.quantity} шт.`
              );
            }
          }
          break;

        case ComboItemType.CHOICE:
          if (!selection) {
            throw new BadRequestException(
              `Не сделан выбор в группе: ${item.groupName || 'Группа выбора'}`
            );
          }

          const totalSelected = selection.selectedProducts.reduce(
            (sum: number, p: any) => sum + p.quantity, 0
          );

          if (totalSelected < item.minSelect || totalSelected > item.maxSelect) {
            throw new BadRequestException(
              `В группе "${item.groupName}" нужно выбрать от ${item.minSelect} до ${item.maxSelect} продуктов`
            );
          }

          // Проверяем ограничения по продуктам
          for (const selected of selection.selectedProducts) {
            const productInItem = item.products.find(
              (p: any) => p.productId === selected.productId
            );

            if (!productInItem) {
              throw new BadRequestException(`Продукт не доступен для выбора в этой группе`);
            }

            if (!productInItem.allowMultiple && selected.quantity > 1) {
              throw new BadRequestException(
                `Продукт ${productInItem.product.title} можно выбрать только один раз`
              );
            }

            if (productInItem.maxQuantity && selected.quantity > productInItem.maxQuantity) {
              throw new BadRequestException(
                `Для продукта ${productInItem.product.title} максимум ${productInItem.maxQuantity} шт.`
              );
            }
          }
          break;

        case ComboItemType.OPTIONAL:
          // Опциональные элементы могут быть не выбраны
          if (selection) {
            // Если выбраны, проверяем что количество в пределах допустимого
            for (const selected of selection.selectedProducts) {
              const productInItem = item.products.find(
                (p: any) => p.productId === selected.productId
              );

              if (productInItem?.maxQuantity && selected.quantity > productInItem.maxQuantity) {
                throw new BadRequestException(
                  `Для продукта ${productInItem.product.title} максимум ${productInItem.maxQuantity} шт.`
                );
              }
            }
          }
          break;
      }
    }
  }

  /**
   * Создание заказа с комбо
   */
  async createComboOrder(dto: OrderComboItemDto) {
    const priceCalculation = await this.calculateComboPrice({
      comboId: dto.comboId,
      selections: dto.selections
    });

    // Здесь логика создания заказа с комбо
    // Возвращаем структуру для создания OrderItem
    return {
      productId: dto.comboId,
      quantity: 1,
      price: priceCalculation.totalPrice,
      // Дополнительная информация о выбранных продуктах
      comboDetails: {
        selections: dto.selections,
        breakdown: priceCalculation.breakdown
      }
    };
  }

  /**
   * Получение доступных продуктов для добавления в комбо
   */
  async getAvailableProductsForCombo(comboId: string) {
    const combo = await this.getComboById(comboId);
    
    // Собираем все ID продуктов, уже входящих в комбо
    const existingProductIds = combo.comboItems.flatMap(item =>
      item.products.map(p => p.productId)
    );

    return this.prisma.product.findMany({
      where: {
        isUsed: true,
        isCombo: false,
        id: { notIn: existingProductIds }
      },
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        category: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });
  }

  /**
   * Получение информации о составе комбо
   */
  async getComboComposition(comboId: string) {
    const combo = await this.getComboById(comboId);
    
    const composition = {
      comboId: combo.id,
      title: combo.title,
      basePrice: combo.price,
      items: combo.comboItems.map(item => ({
        id: item.id,
        type: item.type,
        groupName: item.groupName,
        minSelect: item.minSelect,
        maxSelect: item.maxSelect,
        products: item.products.map(p => ({
          productId: p.productId,
          title: p.product.title,
          baseQuantity: p.quantity,
          additionalPrice: p.additionalPrice,
          allowMultiple: p.allowMultiple,
          maxQuantity: p.maxQuantity,
          price: p.product.price
        }))
      }))
    };

    return composition;
  }

  /**
   * Проверка, является ли продукт частью какого-либо комбо
   */
  async getProductParentCombos(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        comboItemProducts: {
          include: {
            comboItem: {
              include: {
                combo: {
                  include: {
                    comboItems: {
                      include: {
                        products: {
                          include: {
                            product: {
                              select: {
                                id: true,
                                title: true,
                                price: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException('Продукт не найден');
    }

    // Форматируем результат
    const parentCombos = product.comboItemProducts.map(cip => ({
      comboId: cip.comboItem.combo.id,
      title: cip.comboItem.combo.title,
      itemType: cip.comboItem.type,
      groupName: cip.comboItem.groupName,
      quantity: cip.quantity,
      additionalPrice: cip.additionalPrice
    }));

    return parentCombos;
  }

}