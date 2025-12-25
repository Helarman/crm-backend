import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) { }

  async create(dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ingredients, sortOrder, clientSortOrder, networkId, ...productData } = dto;
    if (networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: networkId }
      });
      
      if (!network) {
        throw new NotFoundException('Сеть не найдена');
      }
    }

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
         network: networkId ? { connect: { id: networkId } } : undefined,
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
   async assignNetworkToProducts(networkId: string, productIds?: string[]) {
    // Проверяем, что сеть существует
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });
    
    if (!network) {
      throw new NotFoundException('Сеть не найдена');
    }

    // Готовим условие для фильтрации продуктов
    const whereCondition: any = {
      networkId: null // Только продукты без сети
    };

    // Если указаны конкретные ID продуктов
    if (productIds && productIds.length > 0) {
      whereCondition.id = { in: productIds };
    }

    // Получаем продукты для обновления
    const productsToUpdate = await this.prisma.product.findMany({
      where: whereCondition
    });

    if (productsToUpdate.length === 0) {
      throw new BadRequestException('Нет продуктов для обновления');
    }

    // Обновляем продукты
    const updateResult = await this.prisma.product.updateMany({
      where: whereCondition,
      data: {
        networkId: networkId
      }
    });

    return {
      message: `Сеть назначена для ${updateResult.count} продуктов`,
      updatedCount: updateResult.count
    };
  }

 async getProductsWithoutNetwork() {
  const products = await this.prisma.product.findMany({
    where: {
      networkId: null
    },
    select: {
      id: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return products.map(product => product.id);
}

async getProductsByNetwork(networkId: string) {
  const network = await this.prisma.network.findUnique({
    where: { id: networkId }
  });
  
  if (!network) {
    throw new NotFoundException('Сеть не найдена');
  }

  return this.prisma.product.findMany({
    where: {
      networkId: networkId,
      isUsed: true // Только активные продукты
    },
    include: {
      category: true,
      additives: true,
      workshops: {
        include: {
          workshop: true
        }
      },
      restaurantPrices: true
    },
    orderBy: {
      sortOrder: 'desc'
    }
  });
}

// Метод для получения удаленных продуктов по сети (isUsed: false)
async getDeletedProductsByNetwork(networkId: string) {
  const network = await this.prisma.network.findUnique({
    where: { id: networkId }
  });
  
  if (!network) {
    throw new NotFoundException('Сеть не найдена');
  }

  return this.prisma.product.findMany({
    where: {
      networkId: networkId,
      isUsed: false // Только удаленные продукты
    },
    include: {
      category: true,
      additives: true,
      workshops: {
        include: {
          workshop: true
        }
      },
      restaurantPrices: true,
      network: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
}


  async update(id: string, dto: ProductDto) {
    const { restaurantPrices, additives, categoryId, workshopIds, ingredients, sortOrder, clientSortOrder, networkId, ...productData } = dto;

    const currentProduct = await this.getById(id);
    const isCategoryChanging = categoryId && currentProduct.categoryId !== categoryId;
    if (currentProduct.networkId && networkId && currentProduct.networkId !== networkId) {
        throw new BadRequestException('Нельзя изменить сеть продукта');
      }
      
      // Можно установить сеть, если она еще не установлена
      if (!currentProduct.networkId && networkId) {
        const network = await this.prisma.network.findUnique({
          where: { id: networkId }
        });
        
        if (!network) {
          throw new NotFoundException('Сеть не найдена');
        }
      }

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
        network: !currentProduct.networkId && networkId ? { connect: { id: networkId } } : undefined,
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


  async getByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: {
        categoryId,
        publishedOnWebsite: true,
         isUsed: true
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

    async updateProductOrder(productId: string, newOrder: number, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

     if (newOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }
    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    // Получаем все продукты в категории
    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { sortOrder: 'asc' }
    });

    if (newOrder > categoryProducts.length) {
      throw new BadRequestException('Порядок превышает количество продуктов в категории');
    }

    // Удаляем текущий продукт из списка
    const productsWithoutCurrent = categoryProducts.filter(p => p.id !== productId);
    
    // Вставляем продукт на новую позицию
      const reorderedProducts = [
        ...productsWithoutCurrent.slice(0, newOrder - 1),
        product,
        ...productsWithoutCurrent.slice(newOrder - 1)
      ];

    // Обновляем порядок всех продуктов в категории
      for (let i = 0; i < reorderedProducts.length; i++) {
        await this.prisma.product.update({
          where: { id: reorderedProducts[i].id },
          data: { sortOrder: i + 1 }
        });
      }

    return this.getById(productId);
  }

  async updateClientProductOrder(productId: string, newOrder: number, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

     if (newOrder < 1) {
      throw new BadRequestException('Порядок не может быть меньше 1');
    }

    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    // Получаем все продукты в категории
    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { clientSortOrder: 'asc' }
    });

    if (newOrder > categoryProducts.length) {
      throw new BadRequestException('Порядок превышает количество продуктов в категории');
    }
    // Удаляем текущий продукт из списка
    const productsWithoutCurrent = categoryProducts.filter(p => p.id !== productId);
    
    // Вставляем продукт на новую позицию
      const reorderedProducts = [
      ...productsWithoutCurrent.slice(0, newOrder - 1),
      product,
      ...productsWithoutCurrent.slice(newOrder - 1)
    ];
    // Обновляем клиентский порядок всех продуктов в категории
   for (let i = 0; i < reorderedProducts.length; i++) {
      await this.prisma.product.update({
        where: { id: reorderedProducts[i].id },
        data: { clientSortOrder: i + 1 }
      });
    }

    return this.getById(productId);
  }

  async moveProductUp(productId: string, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { sortOrder: 'asc' }
    });

    const currentIndex = categoryProducts.findIndex(p => p.id === productId);
    
    if (currentIndex === 0) {
      throw new BadRequestException('Продукт уже на первой позиции');
    }

    // Меняем местами с предыдущим продуктом
    const prevProduct = categoryProducts[currentIndex - 1];
    
    await this.prisma.product.update({
      where: { id: productId },
      data: { sortOrder: prevProduct.sortOrder }
    });

    await this.prisma.product.update({
      where: { id: prevProduct.id },
      data: { sortOrder: product.sortOrder }
    });

    return this.getById(productId);
  }

  async moveProductDown(productId: string, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { sortOrder: 'asc' }
    });

    const currentIndex = categoryProducts.findIndex(p => p.id === productId);
    
    if (currentIndex === categoryProducts.length - 1) {
      throw new BadRequestException('Продукт уже на последней позиции');
    }

    // Меняем местами со следующим продуктом
    const nextProduct = categoryProducts[currentIndex + 1];
    
    await this.prisma.product.update({
      where: { id: productId },
      data: { sortOrder: nextProduct.sortOrder }
    });

    await this.prisma.product.update({
      where: { id: nextProduct.id },
      data: { sortOrder: product.sortOrder }
    });

    return this.getById(productId);
  }

  async moveProductUpOnClient(productId: string, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { clientSortOrder: 'asc' }
    });

    const currentIndex = categoryProducts.findIndex(p => p.id === productId);
    
    if (currentIndex === 0) {
      throw new BadRequestException('Продукт уже на первой позиции');
    }

    // Меняем местами с предыдущим продуктом
    const prevProduct = categoryProducts[currentIndex - 1];
    
    await this.prisma.product.update({
      where: { id: productId },
      data: { clientSortOrder: prevProduct.clientSortOrder }
    });

    await this.prisma.product.update({
      where: { id: prevProduct.id },
      data: { clientSortOrder: product.clientSortOrder }
    });

    return this.getById(productId);
  }

  async moveProductDownOnClient(productId: string, categoryId: string) {
    const product = await this.getById(productId);

    // Проверяем, что продукт принадлежит указанной категории
    if (product.categoryId !== categoryId && categoryId !== 'uncategorized') {
      throw new BadRequestException('Продукт не принадлежит указанной категории');
    }

    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    const categoryProducts = await this.prisma.product.findMany({
      where: whereCondition,
      orderBy: { clientSortOrder: 'asc' }
    });

    const currentIndex = categoryProducts.findIndex(p => p.id === productId);
    
    if (currentIndex === categoryProducts.length - 1) {
      throw new BadRequestException('Продукт уже на последней позиции');
    }

    // Меняем местами со следующим продуктом
    const nextProduct = categoryProducts[currentIndex + 1];
    
    await this.prisma.product.update({
      where: { id: productId },
      data: { clientSortOrder: nextProduct.clientSortOrder }
    });

    await this.prisma.product.update({
      where: { id: nextProduct.id },
      data: { clientSortOrder: product.clientSortOrder }
    });

    return this.getById(productId);
  }

  async getCategoryProducts(categoryId: string) {
    const whereCondition = categoryId === 'uncategorized' 
      ? { categoryId: null }
      : { categoryId };

    return this.prisma.product.findMany({
      where: {...whereCondition,  isUsed: true },
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
      orderBy: [
        {
          sortOrder: 'asc',
        }
      ],
    });
  }


  async getAll(searchTerm?: string) {

    return this.prisma.product.findMany({
      where: {
        isUsed: true 
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
        network: true,
      },
    });
  }


  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { 
        id,
        isUsed: true // Проверяем, что продукт активен
      },
      include: {
        restaurantPrices: true,
        category: true,
        additives: true,
        workshops: {
          include: {
            workshop: true
          }
        },
        network: true,
      },
    });

    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  // Мягкое удаление (soft delete)
  async delete(id: string) {
    const product = await this.getById(id);
    
    // Вместо удаления устанавливаем isUsed = false
    return this.prisma.product.update({
      where: { id },
      data: { isUsed: false },
    });
  }

  

  
async assignWorkshopsToMultiple(productIds: string[], workshopIds: string[]) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  if (!workshopIds || workshopIds.length === 0) {
    throw new BadRequestException('Не указаны ID цехов');
  }

  // Проверяем существование всех цехов (одним запросом)
  const workshops = await this.prisma.workshop.findMany({
    where: { id: { in: workshopIds } },
    select: { id: true }
  });

  if (workshops.length !== workshopIds.length) {
    const foundIds = workshops.map(w => w.id);
    const missingIds = workshopIds.filter(id => !foundIds.includes(id));
    throw new NotFoundException(`Цеха не найдены: ${missingIds.join(', ')}`);
  }

  // Удаляем старые связи для всех продуктов сразу
  await this.prisma.productWorkshop.deleteMany({
    where: { productId: { in: productIds } }
  });

  // Создаем новые связи пакетно
  const workshopConnections: { productId: string; workshopId: string }[] = [];
  
  for (const productId of productIds) {
    for (const workshopId of workshopIds) {
      workshopConnections.push({ productId, workshopId });
    }
  }

  if (workshopConnections.length > 0) {
    // Используем createMany с chunking для больших объемов
    const batchSize = 1000; // Оптимальный размер пачки для PostgreSQL
    for (let i = 0; i < workshopConnections.length; i += batchSize) {
      const batch = workshopConnections.slice(i, i + batchSize);
      await this.prisma.productWorkshop.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
  }

  return {
    message: `Цеха назначены для ${productIds.length} продуктов`,
    updatedCount: productIds.length,
    connectionsCreated: workshopConnections.length
  };
}

async assignAdditivesToMultiple(productIds: string[], additiveIds: string[]) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  // Если additiveIds пустой или не указан, очищаем связи
  if (!additiveIds || additiveIds.length === 0) {
    // Для очистки связей используем set: [] для каждого продукта
    return await this.prisma.$transaction(async (tx) => {
      const updatePromises = productIds.map(productId =>
        tx.product.update({
          where: { id: productId },
          data: {
            additives: { set: [] } // Очищаем все связи с добавками
          }
        })
      );

      await Promise.all(updatePromises);

      return {
        message: `Модификаторы очищены для ${productIds.length} продуктов`,
        updatedCount: productIds.length
      };
    });
  }

  // Проверяем существование модификаторов одним запросом
  const additives = await this.prisma.additive.findMany({
    where: { id: { in: additiveIds } },
    select: { id: true }
  });

  if (additives.length !== additiveIds.length) {
    const foundIds = additives.map(a => a.id);
    const missingIds = additiveIds.filter(id => !foundIds.includes(id));
    throw new NotFoundException(`Модификаторы не найдены: ${missingIds.join(', ')}`);
  }

  // Проверяем существование продуктов одним запросом
  const products = await this.prisma.product.findMany({
    where: { id: { in: productIds }, isUsed: true },
    select: { id: true }
  });

  if (products.length !== productIds.length) {
    const foundIds = products.map(p => p.id);
    const missingIds = productIds.filter(id => !foundIds.includes(id));
    throw new NotFoundException(`Продукты не найдены или удалены: ${missingIds.join(', ')}`);
  }

  // Используем транзакцию для атомарности
  return await this.prisma.$transaction(async (tx) => {
    // Обновляем каждый продукт, устанавливая новые связи с добавками
    const updatePromises = productIds.map(productId =>
      tx.product.update({
        where: { id: productId },
        data: {
          additives: {
            set: additiveIds.map(id => ({ id })) // Устанавливаем новые связи
          }
        }
      })
    );

    await Promise.all(updatePromises);

    return {
      message: `Модификаторы назначены для ${productIds.length} продуктов`,
      updatedCount: productIds.length,
      additivesCount: additiveIds.length
    };
  });
}


async deleteMultiple(productIds: string[]) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов для удаления');
  }

  // Используем один updateMany вместо множества update
  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: { isUsed: false }
  });

  return {
    message: `Удалено ${result.count} продуктов`,
    deletedCount: result.count
  };
}

async updateCategoryForMultiple(productIds: string[], categoryId: string) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  // Если categoryId указан, проверяем существование категории
  if (categoryId) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true }
    });
    
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }
  }

  // Обновляем все продукты одним запросом
  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: {
      categoryId: categoryId || null,
      // Автоматически обновляем порядок сортировки при смене категории
      sortOrder: undefined, // Будет установлен при следующем нормализации
      clientSortOrder: undefined
    }
  });

  return {
    message: `Категория обновлена для ${result.count} продуктов`,
    updatedCount: result.count
  };
}

async togglePrintLabelsForMultiple(productIds: string[], enable: boolean) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: { printLabels: enable }
  });

  return {
    message: `Печать лейблов ${enable ? 'включена' : 'отключена'} для ${result.count} продуктов`,
    updatedCount: result.count
  };
}

async togglePublishedOnWebsiteForMultiple(productIds: string[], enable: boolean) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: { publishedOnWebsite: enable }
  });

  return {
    message: `Публикация на сайте ${enable ? 'включена' : 'отключена'} для ${result.count} продуктов`,
    updatedCount: result.count
  };
}

async togglePublishedInAppForMultiple(productIds: string[], enable: boolean) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: { publishedInApp: enable }
  });

  return {
    message: `Публикация в приложении ${enable ? 'включена' : 'отключена'} для ${result.count} продуктов`,
    updatedCount: result.count
  };
}

async toggleStopListForMultiple(productIds: string[], enable: boolean) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: true
    },
    data: { isStopList: enable }
  });

  return {
    message: `Стоп-лист ${enable ? 'включен' : 'отключен'} для ${result.count} продуктов`,
    updatedCount: result.count
  };
}

async restoreProducts(productIds: string[]) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов для восстановления');
  }

  const result = await this.prisma.product.updateMany({
    where: {
      id: { in: productIds },
      isUsed: false
    },
    data: { isUsed: true }
  });

  return {
    message: `Восстановлено ${result.count} продуктов`,
    restoredCount: result.count
  };
}

// Оптимизированная массовая операция для обновления порядка продуктов
async batchUpdateProductOrders(orders: Array<{ productId: string; sortOrder: number }>) {
  if (!orders || orders.length === 0) {
    throw new BadRequestException('Не указаны данные для обновления порядка');
  }

  // Используем транзакцию для атомарности
  return await this.prisma.$transaction(async (tx) => {
    const updatePromises = orders.map(order =>
      tx.product.update({
        where: { id: order.productId },
        data: { sortOrder: order.sortOrder }
      })
    );

    await Promise.all(updatePromises);

    return {
      message: `Порядок обновлен для ${orders.length} продуктов`,
      updatedCount: orders.length
    };
  });
}

// Массовое обновление цен в ресторанах
async updateRestaurantPricesBatch(
  productId: string, 
  prices: Array<{ restaurantId: string; price: number; isStopList: boolean }>
) {
  // Используем транзакцию для атомарности
  return await this.prisma.$transaction(async (tx) => {
    // Удаляем старые цены
    await tx.restaurantProductPrice.deleteMany({
      where: { productId }
    });

    // Создаем новые цены пакетно
    if (prices.length > 0) {
      const priceData = prices.map(price => ({
        productId,
        restaurantId: price.restaurantId,
        price: price.price,
        isStopList: price.isStopList
      }));

      // Разбиваем на пачки для больших объемов
      const batchSize = 1000;
      for (let i = 0; i < priceData.length; i += batchSize) {
        const batch = priceData.slice(i, i + batchSize);
        await tx.restaurantProductPrice.createMany({
          data: batch
        });
      }
    }

    return {
      message: `Цены обновлены для ${prices.length} ресторанов`,
      updatedCount: prices.length
    };
  });
}

// Массовое обновление ингредиентов для нескольких продуктов
async updateIngredientsForMultiple(
  productIds: string[], 
  ingredients: Array<{ inventoryItemId: string; quantity: number }>
) {
  if (!productIds || productIds.length === 0) {
    throw new BadRequestException('Не указаны ID продуктов');
  }

  // Проверяем существование ингредиентов
  const inventoryItemIds = ingredients.map(i => i.inventoryItemId);
  const inventoryItems = await this.prisma.inventoryItem.findMany({
    where: { id: { in: inventoryItemIds } },
    select: { id: true }
  });

  if (inventoryItems.length !== inventoryItemIds.length) {
    const foundIds = inventoryItems.map(i => i.id);
    const missingIds = inventoryItemIds.filter(id => !foundIds.includes(id));
    throw new NotFoundException(`Ингредиенты не найдены: ${missingIds.join(', ')}`);
  }

  return await this.prisma.$transaction(async (tx) => {
    // Удаляем старые связи для всех продуктов
    await tx.productIngredient.deleteMany({
      where: { productId: { in: productIds } }
    });

    // Создаем новые связи пакетно
    const ingredientConnections: Array<{
      productId: string;
      inventoryItemId: string;
      quantity: number;
    }> = [];

    for (const productId of productIds) {
      for (const ingredient of ingredients) {
        ingredientConnections.push({
          productId,
          inventoryItemId: ingredient.inventoryItemId,
          quantity: ingredient.quantity
        });
      }
    }

    if (ingredientConnections.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < ingredientConnections.length; i += batchSize) {
        const batch = ingredientConnections.slice(i, i + batchSize);
        await tx.productIngredient.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
    }

    return {
      message: `Ингредиенты обновлены для ${productIds.length} продуктов`,
      updatedCount: productIds.length,
      connectionsCreated: ingredientConnections.length
    };
  });
}

  // Получение удаленных продуктов
  async getDeletedProducts(searchTerm?: string) {
    let whereCondition: any = {
      isUsed: false
    };

    if (searchTerm) {
      whereCondition = {
        ...whereCondition,
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
        ]
      };
    }

    return this.prisma.product.findMany({
      where: whereCondition,
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        category: true,
        network: true
      }
    });
  }

  // Окончательное удаление (hard delete) - только для администратора
  async hardDelete(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

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

}