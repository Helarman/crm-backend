// src/additives/additive.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAdditiveDto } from './dto/create-additive.dto';
import { UpdateAdditiveDto } from './dto/update-additive.dto';
import { AdditiveWithRelations } from './interfaces/additive.interface';

@Injectable()
export class AdditiveService {
  private readonly logger = new Logger(AdditiveService.name);

  constructor(private prisma: PrismaService) {}

 async create(createAdditiveDto: CreateAdditiveDto): Promise<AdditiveWithRelations> {
  // Проверяем inventoryItem если указан
  if (createAdditiveDto.inventoryItemId) {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: createAdditiveDto.inventoryItemId }
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${createAdditiveDto.inventoryItemId} not found`);
    }

    // Проверяем совместимость сетей
    if (createAdditiveDto.networkId) {
      if (inventoryItem.networkId && inventoryItem.networkId !== createAdditiveDto.networkId) {
        throw new BadRequestException('Inventory item and additive must belong to the same network');
      }
    }
  }

  return this.prisma.additive.create({
    data: {
      title: createAdditiveDto.title,
      price: createAdditiveDto.price,
      ingredientQuantity: createAdditiveDto.ingredientQuantity ?? 1.0, // Добавляем
      ...(createAdditiveDto.networkId && {
        network: {
          connect: { id: createAdditiveDto.networkId }
        }
      }),
      ...(createAdditiveDto.inventoryItemId && {
        inventoryItem: {
          connect: { id: createAdditiveDto.inventoryItemId }
        }
      })
    },
    include: { 
      products: true,
      network: true,
      inventoryItem: true 
    },
  });
}

  async findAll(): Promise<AdditiveWithRelations[]> {
    return this.prisma.additive.findMany({
      include: { 
        products: true,
        network: true,
        inventoryItem: true 
      },
    });
  }

  async findOne(id: string): Promise<AdditiveWithRelations | null> {
    return this.prisma.additive.findUnique({
      where: { id },
      include: { 
        products: true,
        network: true,
        inventoryItem: true 
      },
    });
  }

  async update(
  id: string,
  updateAdditiveDto: UpdateAdditiveDto,
): Promise<AdditiveWithRelations> {
  // Проверяем существование additive
  const existingAdditive = await this.prisma.additive.findUnique({
    where: { id },
    include: { inventoryItem: true }
  });

  if (!existingAdditive) {
    throw new NotFoundException(`Additive with ID ${id} not found`);
  }

  // Проверяем inventoryItem если указан
  if (updateAdditiveDto.inventoryItemId !== undefined) {
    if (updateAdditiveDto.inventoryItemId === null) {
      // Если inventoryItemId явно установлен в null, отключаем связь
      // Проверяем, не используется ли этот инвентарный товар в заказах
      const orderItemsCount = await this.prisma.orderItem.count({
        where: {
          additives: {
            some: { id }
          }
        }
      });

      if (orderItemsCount > 0 && existingAdditive.inventoryItemId) {
        this.logger.warn(`Additive ${id} has ${orderItemsCount} order items, inventory item disconnection may affect stock management`);
      }
    } else if (updateAdditiveDto.inventoryItemId) {
      // Если указан новый inventoryItemId
      const inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: { id: updateAdditiveDto.inventoryItemId }
      });

      if (!inventoryItem) {
        throw new NotFoundException(`Inventory item with ID ${updateAdditiveDto.inventoryItemId} not found`);
      }

      // Проверяем совместимость сетей
      const networkId = updateAdditiveDto.networkId ?? existingAdditive.networkId;
      if (networkId && inventoryItem.networkId && inventoryItem.networkId !== networkId) {
        throw new BadRequestException('Inventory item and additive must belong to the same network');
      }
    }
  }

  // Подготавливаем данные для обновления
  const updateData: any = {
    ...(updateAdditiveDto.title !== undefined && { title: updateAdditiveDto.title }),
    ...(updateAdditiveDto.price !== undefined && { price: updateAdditiveDto.price }),
    ...(updateAdditiveDto.ingredientQuantity !== undefined && { 
      ingredientQuantity: updateAdditiveDto.ingredientQuantity 
    }), // Добавляем
  };

  // Обрабатываем связь с сетью
  if ('networkId' in updateAdditiveDto) {
    if (updateAdditiveDto.networkId === null) {
      updateData.network = { disconnect: true };
    } else if (updateAdditiveDto.networkId) {
      updateData.network = { connect: { id: updateAdditiveDto.networkId } };
    }
  }

  // Обрабатываем связь с inventoryItem
  if ('inventoryItemId' in updateAdditiveDto) {
    if (updateAdditiveDto.inventoryItemId === null) {
      updateData.inventoryItem = { disconnect: true };
    } else if (updateAdditiveDto.inventoryItemId) {
      updateData.inventoryItem = { connect: { id: updateAdditiveDto.inventoryItemId } };
    }
  }

  return this.prisma.additive.update({
    where: { id },
    data: updateData,
    include: { 
      products: true,
      network: true,
      inventoryItem: true 
    },
  });
}

  async remove(id: string): Promise<AdditiveWithRelations> {
    // Проверяем, не используется ли additive в заказах
    const orderItemsCount = await this.prisma.orderItem.count({
      where: {
        additives: {
          some: { id }
        }
      }
    });

    if (orderItemsCount > 0) {
      throw new BadRequestException(
        `Cannot delete additive with ID ${id} because it is used in ${orderItemsCount} order items`
      );
    }

    return this.prisma.additive.delete({
      where: { id },
      include: { 
        products: true,
        network: true,
        inventoryItem: true 
      },
    });
  }

  async addToProduct(additiveId: string, productId: string): Promise<AdditiveWithRelations> {
    const [additive, product] = await Promise.all([
      this.prisma.additive.findUnique({
        where: { id: additiveId },
        include: { network: true, inventoryItem: true }
      }),
      this.prisma.product.findUnique({
        where: { id: productId },
        include: { network: true }
      })
    ]);

    if (!additive) {
      throw new NotFoundException(`Additive with ID ${additiveId} not found`);
    }

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Проверяем совместимость сетей
    if (additive.networkId && product.networkId && additive.networkId !== product.networkId) {
      throw new BadRequestException('Additive and product must belong to the same network');
    }


    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: { 
        products: true,
        network: true,
        inventoryItem: true 
      },
    });
  }

  async removeFromProduct(additiveId: string, productId: string): Promise<AdditiveWithRelations> {
    return this.prisma.additive.update({
      where: { id: additiveId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: { 
        products: true,
        network: true,
        inventoryItem: true 
      },
    });
  }

  async getProductAdditives(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { 
        additives: {
          include: { 
            network: true,
            inventoryItem: true 
          }
        } 
      }
    });
    
    return product?.additives || [];
  }

  async updateProductAdditives(
    productId: string,
    additiveIds: string[],
  ): Promise<AdditiveWithRelations[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { 
        network: true,
        restaurants: {
          select: { id: true }
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Получаем все модификаторы
    const existingAdditives = await this.prisma.additive.findMany({
      where: { id: { in: additiveIds } },
      include: { 
        network: true,
        inventoryItem: true 
      }
    });

    if (existingAdditives.length !== additiveIds.length) {
      const foundIds = existingAdditives.map(a => a.id);
      const missingIds = additiveIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Some additives not found: ${missingIds.join(', ')}`);
    }

    // Проверяем, что все модификаторы совместимы с продуктом
    if (product.networkId) {
      const incompatibleAdditives = existingAdditives.filter(
        additive => additive.networkId && additive.networkId !== product.networkId
      );
      
      if (incompatibleAdditives.length > 0) {
        throw new BadRequestException(
          `Some additives belong to different network: ${incompatibleAdditives.map(a => a.id).join(', ')}`
        );
      }
    }

    // Проверяем доступность инвентарных товаров
    const restaurantId = product.restaurants[0]?.id;
    if (restaurantId) {
      for (const additive of existingAdditives) {
        if (additive.inventoryItemId) {
          const isAvailable = await this.checkInventoryAvailability(
            additive.inventoryItemId,
            restaurantId
          );

          if (!isAvailable) {
            this.logger.warn(`Additive ${additive.id} inventory item ${additive.inventoryItemId} may be out of stock for restaurant ${restaurantId}`);
          }
        }
      }
    }

    // Обновляем связи
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        additives: {
          set: additiveIds.map(id => ({ id })),
        },
      },
    });

    // Возвращаем обновленный список
    return this.getProductAdditives(productId);
  }

  async getByNetwork(networkId: string): Promise<AdditiveWithRelations[]> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    return this.prisma.additive.findMany({
      where: {
        OR: [
          { networkId: networkId },
          { networkId: null }
        ]
      },
      include: {
        products: true,
        network: true,
        inventoryItem: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getByNetworkPaginated(
    networkId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: AdditiveWithRelations[]; total: number; page: number; limit: number }> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    const skip = (page - 1) * limit;
    
    const [additives, total] = await Promise.all([
      this.prisma.additive.findMany({
        where: {
          OR: [
            { networkId: networkId },
            { networkId: null }
          ]
        },
        include: {
          products: true,
          network: true,
          inventoryItem: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.additive.count({
        where: {
          OR: [
            { networkId: networkId },
            { networkId: null }
          ]
        }
      })
    ]);

    return {
      data: additives,
      total,
      page,
      limit
    };
  }

  async getGlobalAdditives(): Promise<AdditiveWithRelations[]> {
    return this.prisma.additive.findMany({
      where: {
        networkId: null
      },
      include: {
        products: true,
        network: true,
        inventoryItem: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Вспомогательный метод для проверки доступности инвентаря
  private async checkInventoryAvailability(
    inventoryItemId: string,
    restaurantId: string
  ): Promise<boolean> {
    try {
      const warehouseItems = await this.prisma.warehouseItem.findMany({
        where: {
          inventoryItemId,
          warehouse: {
            restaurantId
          }
        },
        select: {
          quantity: true,
          reserved: true
        }
      });

      if (warehouseItems.length === 0) {
        return false; // Нет на складах ресторана
      }

      // Проверяем общее доступное количество
      const totalAvailable = warehouseItems.reduce(
        (sum, item) => sum + (item.quantity - item.reserved),
        0
      );

      return totalAvailable > 0;
    } catch (error) {
      this.logger.error(`Error checking inventory availability: ${error.message}`);
      return false;
    }
  }

  // Новый метод: получить модификаторы с привязанным инвентарем
  async getAdditivesWithInventory(): Promise<AdditiveWithRelations[]> {
    return this.prisma.additive.findMany({
      where: {
        inventoryItemId: {
          not: null
        }
      },
      include: {
        products: true,
        network: true,
        inventoryItem: {
          include: {
            category: true,
            warehouseItems: {
              include: {
                warehouse: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Новый метод: получить модификаторы по инвентарному товару
  async getByInventoryItem(inventoryItemId: string): Promise<AdditiveWithRelations[]> {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${inventoryItemId} not found`);
    }

    return this.prisma.additive.findMany({
      where: {
        inventoryItemId
      },
      include: {
        products: true,
        network: true,
        inventoryItem: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}