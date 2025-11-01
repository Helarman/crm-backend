import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) { }

  async getAll(searchTerm?: string) {
    if (searchTerm) return this.getSearchTermFilter(searchTerm);

    return this.prisma.product.findMany({
      orderBy: [
        {
          sortOrder: 'desc',
        },
        {
          createdAt: 'desc',
        }
      ],
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }

  private async getSearchTermFilter(searchTerm: string) {
    return this.prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            workshops: {
              some: {
                workshop: {
                  name: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  }
                }
              }
            }
          },
        ],
      },
      orderBy: [
        {
          sortOrder: 'desc',
        },
        {
          createdAt: 'desc',
        }
      ],
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });

    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async create(dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ingredients, sortOrder, clientSortOrder, ...productData } = dto;
    let finalSortOrder = sortOrder;
    let finalClientSortOrder = clientSortOrder;

    if (categoryId) {
      if (sortOrder === undefined) {
        const maxOrder = await this.prisma.product.aggregate({
          where: { categoryId },
          _max: { sortOrder: true }
        });
        finalSortOrder = (maxOrder._max.sortOrder || 0) + 1;
      }

      if (clientSortOrder === undefined) {
        const maxClientOrder = await this.prisma.product.aggregate({
          where: { categoryId },
          _max: { clientSortOrder: true }
        });
        finalClientSortOrder = (maxClientOrder._max.clientSortOrder || 0) + 1;
      }
    } else {
      // Для продуктов без категории
      if (sortOrder === undefined) {
        const maxOrder = await this.prisma.product.aggregate({
          where: { categoryId: null },
          _max: { sortOrder: true }
        });
        finalSortOrder = (maxOrder._max.sortOrder || 0) + 1;
      }

      if (clientSortOrder === undefined) {
        const maxClientOrder = await this.prisma.product.aggregate({
          where: { categoryId: null },
          _max: { clientSortOrder: true }
        });
        finalClientSortOrder = (maxClientOrder._max.clientSortOrder || 0) + 1;
      }
    }
    // Создаем продукт
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        sortOrder: finalSortOrder,
        clientSortOrder: finalClientSortOrder,
        description: productData.description || '',
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        additives: additives ? { connect: additives.map(id => ({ id })) } : undefined,
        workshops: workshopIds ? {
          create: workshopIds.map(id => ({
            workshop: { connect: { id } }
          }))
        } : undefined,
        ingredients: ingredients ? {
          create: ingredients.map(ing => ({
            quantity: ing.quantity,
            inventoryItem: { connect: { id: ing.inventoryItemId } }
          }))
        } : undefined,
      },
    });

    // Создаем цены для ресторанов
    if (restaurantPrices?.length) {
      await this.prisma.restaurantProductPrice.createMany({
        data: restaurantPrices.map(rp => ({
          productId: product.id,
          restaurantId: rp.restaurantId,
          price: rp.price,
          isStopList: rp.isStopList,
        })),
      });
    }

    return this.getById(product.id);
  }
  async update(id: string, dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ingredients, sortOrder, clientSortOrder, ...productData } = dto;

    const currentProduct = await this.getById(id);
    const isCategoryChanging = categoryId && currentProduct.categoryId !== categoryId;

    let sortOrderData = {};
    let clientSortOrderData = {};

    if (isCategoryChanging) {
      // При смене категории устанавливаем порядок в конец новой категории
      if (sortOrder === undefined) {
        const maxOrder = await this.prisma.product.aggregate({
          where: { categoryId },
          _max: { sortOrder: true }
        });
        sortOrderData = { sortOrder: (maxOrder._max.sortOrder || 0) + 1 };
      }

      if (clientSortOrder === undefined) {
        const maxClientOrder = await this.prisma.product.aggregate({
          where: { categoryId },
          _max: { clientSortOrder: true }
        });
        clientSortOrderData = { clientSortOrder: (maxClientOrder._max.clientSortOrder || 0) + 1 };
      }
    } else {
      // В той же категории - сохраняем текущий порядок или обновляем если указан
      if (sortOrder !== undefined) {
        sortOrderData = { sortOrder };
      }
      if (clientSortOrder !== undefined) {
        clientSortOrderData = { clientSortOrder };
      }
    }


    // Удаляем старые связи с ингредиентами
    await this.prisma.productIngredient.deleteMany({
      where: { productId: id }
    });

    // Удаляем старые связи с workshops
    await this.prisma.productWorkshop.deleteMany({
      where: { productId: id }
    });

    // Обновляем продукт
    await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...sortOrderData,
        ...clientSortOrderData,
        description: productData.description || '',
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        additives: additives ? { set: additives.map(id => ({ id })) } : undefined,
        ingredients: ingredients ? {
          create: ingredients.map(ing => ({
            quantity: ing.quantity,
            inventoryItem: { connect: { id: ing.inventoryItemId } }
          }))
        } : undefined,
        workshops: workshopIds ? {
          create: workshopIds.map(workshopId => ({
            workshop: { connect: { id: workshopId } }
          }))
        } : undefined,
      },
    });

    // Обновляем цены в ресторанах
    if (restaurantPrices) {
      await this.prisma.restaurantProductPrice.deleteMany({
        where: { productId: id },
      });

      if (restaurantPrices.length > 0) {
        await this.prisma.restaurantProductPrice.createMany({
          data: restaurantPrices.map(rp => ({
            productId: id,
            restaurantId: rp.restaurantId,
            price: rp.price,
            isStopList: rp.isStopList,
          })),
        });
      }
    }

    return this.getById(id);
  }

  async delete(id: string) {
    await this.getById(id);

    await this.prisma.orderItem.deleteMany({
      where: { productId: id }
    });

    await this.prisma.productDiscount.deleteMany({
      where: { productId: id }
    });

    await this.prisma.productWorkshop.deleteMany({
      where: { productId: id }
    });

    await this.prisma.restaurantProductPrice.deleteMany({
      where: { productId: id },
    });

    await this.prisma.productIngredient.deleteMany({
      where: { productId: id }
    });

    return this.prisma.product.delete({
      where: { id },
    });
  }
  async getByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: {
        categoryId,
        publishedOnWebsite: true
      },

      include: {
        restaurantPrices: {
          where: {
            isStopList: false
          }
        },
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
      orderBy: [
        {
          sortOrder: 'desc',
        },
        {
          createdAt: 'desc',
        }
      ],
    });
  }

  async updateClientSortOrder(id: string, newClientSortOrder: number) {
    const product = await this.getById(id);

    if (newClientSortOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = product.categoryId
      ? { categoryId: product.categoryId }
      : { categoryId: null };

    if (newClientSortOrder !== product.clientSortOrder) {
      const productAtPosition = await this.prisma.product.findFirst({
        where: {
          ...whereCondition,
          clientSortOrder: newClientSortOrder,
          id: { not: id }
        }
      });

      if (productAtPosition) {
        await this.prisma.product.update({
          where: { id: productAtPosition.id },
          data: { clientSortOrder: product.clientSortOrder }
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: { clientSortOrder: newClientSortOrder },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }

  async getCategoryClientOrderStats(categoryId: string) {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      select: {
        id: true,
        title: true,
        clientSortOrder: true
      }
    });

    return {
      count: products.length,
      minOrder: Math.min(...products.map(p => p.clientSortOrder)),
      maxOrder: Math.max(...products.map(p => p.clientSortOrder)),
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        clientSortOrder: p.clientSortOrder
      }))
    };
  }

  async moveProductUpOnClient(productId: string, currentCategoryId: string) {
    const product = await this.getById(productId);

    if (product.clientSortOrder <= 1) {
      throw new BadRequestException('Продукт уже на первой позиции');
    }

    return this.updateClientSortOrder(productId, product.clientSortOrder - 1);
  }

  async moveProductDownOnClient(productId: string, currentCategoryId: string) {
    const product = await this.getById(productId);

    const stats = await this.getCategoryClientOrderStats(currentCategoryId);

    if (product.clientSortOrder >= stats.maxOrder) {
      throw new BadRequestException('Продукт уже на последней позиции');
    }

    return this.updateClientSortOrder(productId, product.clientSortOrder + 1);
  }


  async normalizeCategoryOrders(categoryId?: string) {
    const whereCondition = categoryId
      ? { categoryId }
      : { categoryId: null };

    const products = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { sortOrder: 'asc' }
    });

    // Перенумеровываем продукты начиная с 1
    for (let i = 0; i < products.length; i++) {
      await this.prisma.product.update({
        where: { id: products[i].id },
        data: { sortOrder: i + 1 }
      });
    }

    return products.length;
  }

  async normalizeCategoryClientOrders(categoryId?: string) {
    const whereCondition = categoryId
      ? { categoryId }
      : { categoryId: null };

    const products = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { clientSortOrder: 'asc' }
    });

    for (let i = 0; i < products.length; i++) {
      await this.prisma.product.update({
        where: { id: products[i].id },
        data: { clientSortOrder: i + 1 }
      });
    }

    return products.length;
  }
  async updateSortOrder(id: string, newSortOrder: number) {
    const product = await this.getById(id);

    if (newSortOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = product.categoryId
      ? { categoryId: product.categoryId }
      : { categoryId: null };

    // Если пытаемся поставить на место, которое уже занято
    if (newSortOrder !== product.sortOrder) {
      const productAtPosition = await this.prisma.product.findFirst({
        where: {
          ...whereCondition,
          sortOrder: newSortOrder,
          id: { not: id }
        }
      });

      if (productAtPosition) {
        // Сдвигаем существующий продукт на позицию текущего
        await this.prisma.product.update({
          where: { id: productAtPosition.id },
          data: { sortOrder: product.sortOrder }
        });
      }
    }

    // Обновляем порядок текущего продукта
    return this.prisma.product.update({
      where: { id },
      data: { sortOrder: newSortOrder },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
      },
    });
  }


  async getRestaurantPrices(productId: string) {
    const prices = await this.prisma.restaurantProductPrice.findMany({
      where: { productId },
      include: {
        restaurant: true
      }
    });

    if (!prices) throw new NotFoundException('Цены не найдены');

    return prices.map(price => ({
      restaurantId: price.restaurantId,
      restaurantName: price.restaurant.title,
      price: price.price,
      isStopList: price.isStopList
    }));
  }

  async getIngredients(productId: string) {
    const ingredients = await this.prisma.productIngredient.findMany({
      where: { productId },
      select: {
        inventoryItemId: true,
        quantity: true,
        inventoryItem: {
          select: {
            name: true,
            unit: true
          }
        }
      }
    });
    return ingredients.map(i => ({
      inventoryItemId: i.inventoryItemId,
      quantity: i.quantity,
      name: i.inventoryItem.name,
      unit: i.inventoryItem.unit
    }));
  }
  async togglePrintLabels(id: string) {
    const product = await this.getById(id);
    return this.prisma.product.update({
      where: { id },
      data: { printLabels: !product.printLabels },
    });
  }

  async togglePublishedOnWebsite(id: string) {
    const product = await this.getById(id);
    return this.prisma.product.update({
      where: { id },
      data: { publishedOnWebsite: !product.publishedOnWebsite },
    });
  }

  async togglePublishedInApp(id: string) {
    const product = await this.getById(id);
    return this.prisma.product.update({
      where: { id },
      data: { publishedInApp: !product.publishedInApp },
    });
  }

  async toggleStopList(id: string) {
    const product = await this.getById(id);
    return this.prisma.product.update({
      where: { id },
      data: { isStopList: !product.isStopList },
    });
  }

}