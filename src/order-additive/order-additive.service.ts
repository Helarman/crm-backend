import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateOrderAdditiveDto } from './dto/create-order-additive.dto';
import { UpdateOrderAdditiveDto } from './dto/update-order-additive.dto';
import { OrderAdditiveWithRelations, OrderAdditiveFilter } from './interfaces/order-additive.interface';
import { OrderAdditiveType, EnumOrderType, OrderAdditive } from '@prisma/client';

@Injectable()
export class OrderAdditiveService {
  private readonly logger = new Logger(OrderAdditiveService.name);

  constructor(private prisma: PrismaService) { }

  async create(createOrderAdditiveDto: CreateOrderAdditiveDto): Promise<OrderAdditiveWithRelations> {
    // Проверяем inventoryItem если указан
    if (createOrderAdditiveDto.inventoryItemId) {
      const inventoryItem = await this.prisma.inventoryItem.findUnique({
        where: { id: createOrderAdditiveDto.inventoryItemId }
      });

      if (!inventoryItem) {
        throw new NotFoundException(`Inventory item with ID ${createOrderAdditiveDto.inventoryItemId} not found`);
      }

      // Проверяем совместимость сетей
      if (createOrderAdditiveDto.networkId) {
        if (inventoryItem.networkId && inventoryItem.networkId !== createOrderAdditiveDto.networkId) {
          throw new BadRequestException('Inventory item and order additive must belong to the same network');
        }
      }
    }

    // Проверяем network если указан
    if (createOrderAdditiveDto.networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: createOrderAdditiveDto.networkId }
      });

      if (!network) {
        throw new NotFoundException(`Network with ID ${createOrderAdditiveDto.networkId} not found`);
      }
    }

    return this.prisma.orderAdditive.create({
      data: {
        title: createOrderAdditiveDto.title,
        description: createOrderAdditiveDto.description,
        price: createOrderAdditiveDto.price,
        type: createOrderAdditiveDto.type,
        orderTypes: createOrderAdditiveDto.orderTypes,
        ingredientQuantity: createOrderAdditiveDto.ingredientQuantity ?? 1.0,
        isActive: createOrderAdditiveDto.isActive ?? true,
        ...(createOrderAdditiveDto.networkId && {
          network: {
            connect: { id: createOrderAdditiveDto.networkId }
          }
        }),
        ...(createOrderAdditiveDto.inventoryItemId && {
          inventoryItem: {
            connect: { id: createOrderAdditiveDto.inventoryItemId }
          }
        })
      },
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async findAll(filter?: OrderAdditiveFilter): Promise<OrderAdditiveWithRelations[]> {
    const where: any = {};

    if (filter?.networkId) {
      where.OR = [
        { networkId: filter.networkId },
        { networkId: null }
      ];
    }

    if (filter?.orderType) {
      where.orderTypes = {
        has: filter.orderType
      };
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.type) {
      where.type = filter.type;
    }

    return this.prisma.orderAdditive.findMany({
      where,
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });
  }

  async findOne(id: string): Promise<OrderAdditiveWithRelations | null> {
    return this.prisma.orderAdditive.findUnique({
      where: { id },
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async update(
    id: string,
    updateOrderAdditiveDto: UpdateOrderAdditiveDto,
  ): Promise<OrderAdditiveWithRelations> {
    // Проверяем существование order additive
    const existingOrderAdditive = await this.prisma.orderAdditive.findUnique({
      where: { id },
      include: { inventoryItem: true }
    });

    if (!existingOrderAdditive) {
      throw new NotFoundException(`Order additive with ID ${id} not found`);
    }

    // Проверяем inventoryItem если указан
    if (updateOrderAdditiveDto.inventoryItemId !== undefined) {
      if (updateOrderAdditiveDto.inventoryItemId === null) {
        // Если inventoryItemId явно установлен в null, отключаем связь
        // Проверяем, не используется ли этот инвентарный товар в заказах
        const orderItemsCount = await this.prisma.orderOrderAdditive.count({
          where: {
            orderAdditiveId: id
          }
        });

        if (orderItemsCount > 0 && existingOrderAdditive.inventoryItemId) {
          this.logger.warn(`Order additive ${id} has ${orderItemsCount} order connections, inventory item disconnection may affect stock management`);
        }
      } else if (updateOrderAdditiveDto.inventoryItemId) {
        // Если указан новый inventoryItemId
        const inventoryItem = await this.prisma.inventoryItem.findUnique({
          where: { id: updateOrderAdditiveDto.inventoryItemId }
        });

        if (!inventoryItem) {
          throw new NotFoundException(`Inventory item with ID ${updateOrderAdditiveDto.inventoryItemId} not found`);
        }

        // Проверяем совместимость сетей
        const networkId = updateOrderAdditiveDto.networkId ?? existingOrderAdditive.networkId;
        if (networkId && inventoryItem.networkId && inventoryItem.networkId !== networkId) {
          throw new BadRequestException('Inventory item and order additive must belong to the same network');
        }
      }
    }

    // Проверяем network если указан
    if (updateOrderAdditiveDto.networkId !== undefined && updateOrderAdditiveDto.networkId) {
      const network = await this.prisma.network.findUnique({
        where: { id: updateOrderAdditiveDto.networkId }
      });

      if (!network) {
        throw new NotFoundException(`Network with ID ${updateOrderAdditiveDto.networkId} not found`);
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      ...(updateOrderAdditiveDto.title !== undefined && { title: updateOrderAdditiveDto.title }),
      ...(updateOrderAdditiveDto.description !== undefined && { description: updateOrderAdditiveDto.description }),
      ...(updateOrderAdditiveDto.price !== undefined && { price: updateOrderAdditiveDto.price }),
      ...(updateOrderAdditiveDto.type !== undefined && { type: updateOrderAdditiveDto.type }),
      ...(updateOrderAdditiveDto.orderTypes !== undefined && { orderTypes: updateOrderAdditiveDto.orderTypes }),
      ...(updateOrderAdditiveDto.ingredientQuantity !== undefined && {
        ingredientQuantity: updateOrderAdditiveDto.ingredientQuantity
      }),
      ...(updateOrderAdditiveDto.sortOrder !== undefined && { sortOrder: updateOrderAdditiveDto.sortOrder }),
      ...(updateOrderAdditiveDto.isActive !== undefined && { isActive: updateOrderAdditiveDto.isActive }),
    };

    // Обрабатываем связь с сетью
    if ('networkId' in updateOrderAdditiveDto) {
      if (updateOrderAdditiveDto.networkId === null) {
        updateData.network = { disconnect: true };
      } else if (updateOrderAdditiveDto.networkId) {
        updateData.network = { connect: { id: updateOrderAdditiveDto.networkId } };
      }
    }

    // Обрабатываем связь с inventoryItem
    if ('inventoryItemId' in updateOrderAdditiveDto) {
      if (updateOrderAdditiveDto.inventoryItemId === null) {
        updateData.inventoryItem = { disconnect: true };
      } else if (updateOrderAdditiveDto.inventoryItemId) {
        updateData.inventoryItem = { connect: { id: updateOrderAdditiveDto.inventoryItemId } };
      }
    }

    return this.prisma.orderAdditive.update({
      where: { id },
      data: updateData,
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async remove(id: string): Promise<OrderAdditiveWithRelations> {
    // Проверяем, не используется ли order additive в заказах
    const orderConnectionsCount = await this.prisma.orderOrderAdditive.count({
      where: {
        orderAdditiveId: id
      }
    });

    if (orderConnectionsCount > 0) {
      throw new BadRequestException(
        `Cannot delete order additive with ID ${id} because it is used in ${orderConnectionsCount} orders`
      );
    }

    return this.prisma.orderAdditive.delete({
      where: { id },
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  // Метод для получения модификаторов заказа по типу заказа и сети
  async getByOrderTypeAndNetwork(
    orderType: EnumOrderType,
    networkId?: string
  ): Promise<OrderAdditiveWithRelations[]> {
    const where: any = {
      orderTypes: {
        has: orderType
      },
      isActive: true
    };

    if (networkId) {
      where.OR = [
        { networkId: networkId },
        { networkId: null }
      ];
    }

    return this.prisma.orderAdditive.findMany({
      where,
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async addToOrder(
    orderAdditiveId: string,
    orderId: string,
    quantity: number = 1
  ): Promise<OrderAdditiveWithRelations> {
    const [orderAdditive, order] = await Promise.all([
      this.prisma.orderAdditive.findUnique({
        where: { id: orderAdditiveId },
        include: { network: true }
      }),
      this.prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: true }
      })
    ]);

    if (!orderAdditive) {
      throw new NotFoundException(`Order additive with ID ${orderAdditiveId} not found`);
    }

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Проверяем, подходит ли модификатор для типа заказа
    if (!orderAdditive.orderTypes.includes(order.type)) {
      throw new BadRequestException(`Order additive is not available for order type: ${order.type}`);
    }

    // Проверяем совместимость сетей
    const restaurantNetworkId = order.restaurant.networkId;
    if (orderAdditive.networkId && restaurantNetworkId && orderAdditive.networkId !== restaurantNetworkId) {
      throw new BadRequestException('Order additive and order restaurant must belong to the same network');
    }

    // Конвертируем quantity в число, если это необходимо
    const quantityNumber = Number(quantity);
    if (isNaN(quantityNumber) || quantityNumber < 1) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    // Проверяем, не добавлен ли уже этот модификатор к заказу
    const existingConnection = await this.prisma.orderOrderAdditive.findUnique({
      where: {
        orderId_orderAdditiveId: {
          orderId,
          orderAdditiveId
        }
      }
    });

    if (existingConnection) {
      // Если уже существует, обновляем количество
      await this.prisma.orderOrderAdditive.update({
        where: {
          id: existingConnection.id
        },
        data: {
          quantity: existingConnection.quantity + quantityNumber // Используем quantityNumber
        }
      });
    } else {
      // Создаем новую связь
      await this.prisma.orderOrderAdditive.create({
        data: {
          orderId,
          orderAdditiveId,
          quantity: quantityNumber, // Используем quantityNumber
          price: orderAdditive.price
        }
      });
    }

    // Обновляем общую сумму заказа
    await this.updateOrderTotal(orderId);

    return this.findOne(orderAdditiveId);
  }

  // Метод для удаления модификатора из заказа
  async removeFromOrder(
    orderAdditiveId: string,
    orderId: string
  ): Promise<OrderAdditiveWithRelations> {
    const orderAdditiveOrder = await this.prisma.orderOrderAdditive.findUnique({
      where: {
        orderId_orderAdditiveId: {
          orderId,
          orderAdditiveId
        }
      }
    });

    if (!orderAdditiveOrder) {
      throw new NotFoundException('Order additive not found in this order');
    }

    await this.prisma.orderOrderAdditive.delete({
      where: {
        id: orderAdditiveOrder.id
      }
    });

    // Обновляем общую сумму заказа
    await this.updateOrderTotal(orderId);

    return this.findOne(orderAdditiveId);
  }

  // Метод для получения модификаторов конкретного заказа
  async getOrderAdditives(orderId: string) {
    const orderAdditives = await this.prisma.orderOrderAdditive.findMany({
      where: { orderId },
      include: {
        orderAdditive: {
          include: {
            network: true,
            inventoryItem: true
          }
        }
      }
    });

    return orderAdditives;
  }

  async updateOrderAdditives(
    orderId: string,
    orderAdditiveIds: string[],
  ): Promise<any[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: {
          include: { network: true }
        }
      }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Получаем все модификаторы
    const existingAdditives = await this.prisma.orderAdditive.findMany({
      where: {
        id: { in: orderAdditiveIds },
        isActive: true
      },
      include: {
        network: true,
        inventoryItem: true
      }
    });

    if (existingAdditives.length !== orderAdditiveIds.length) {
      const foundIds = existingAdditives.map(a => a.id);
      const missingIds = orderAdditiveIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Some order additives not found or inactive: ${missingIds.join(', ')}`);
    }

    // Проверяем, что все модификаторы подходят для типа заказа
    const incompatibleAdditives = existingAdditives.filter(
      additive => !additive.orderTypes.includes(order.type)
    );

    if (incompatibleAdditives.length > 0) {
      throw new BadRequestException(
        `Some order additives are not available for order type ${order.type}: ${incompatibleAdditives.map(a => a.id).join(', ')}`
      );
    }

    // Проверяем совместимость сетей
    const restaurantNetworkId = order.restaurant.networkId;
    const incompatibleNetworkAdditives = existingAdditives.filter(
      additive => additive.networkId && restaurantNetworkId && additive.networkId !== restaurantNetworkId
    );

    if (incompatibleNetworkAdditives.length > 0) {
      throw new BadRequestException(
        `Some order additives belong to different network: ${incompatibleNetworkAdditives.map(a => a.id).join(', ')}`
      );
    }

    // Удаляем старые связи
    await this.prisma.orderOrderAdditive.deleteMany({
      where: { orderId }
    });

    // Создаем новые связи
    const orderAdditiveOrders = await Promise.all(
      existingAdditives.map(additive =>
        this.prisma.orderOrderAdditive.create({
          data: {
            orderId,
            orderAdditiveId: additive.id,
            quantity: 1, // Здесь всегда передаем число 1
            price: additive.price
          },
          include: {
            orderAdditive: true
          }
        })
      )
    );

    // Обновляем общую сумму заказа
    await this.updateOrderTotal(orderId);

    return orderAdditiveOrders;
  }

  async getByNetwork(networkId: string): Promise<OrderAdditiveWithRelations[]> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    return this.prisma.orderAdditive.findMany({
      where: {
        OR: [
          { networkId: networkId },
          { networkId: null }
        ]
      },
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async getByNetworkPaginated(
    networkId: string,
    page: number = 1,
    limit: number = 10,
    filter?: OrderAdditiveFilter
  ): Promise<{ data: OrderAdditiveWithRelations[]; total: number; page: number; limit: number }> {
    const network = await this.prisma.network.findUnique({
      where: { id: networkId }
    });

    if (!network) {
      throw new NotFoundException(`Network with ID ${networkId} not found`);
    }

    const where: any = {
      OR: [
        { networkId: networkId },
        { networkId: null }
      ]
    };

    if (filter?.orderType) {
      where.orderTypes = {
        has: filter.orderType
      };
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.type) {
      where.type = filter.type;
    }

    const skip = (page - 1) * limit;

    const [additives, total] = await Promise.all([
      this.prisma.orderAdditive.findMany({
        where,
        include: {
          network: true,
          inventoryItem: true,
          orders: {
            include: {
              order: true
            }
          }
        },
        skip,
        take: limit
      }),
      this.prisma.orderAdditive.count({ where })
    ]);

    return {
      data: additives,
      total,
      page,
      limit
    };
  }

  async getAdditivesWithInventory(): Promise<OrderAdditiveWithRelations[]> {
    return this.prisma.orderAdditive.findMany({
      where: {
        inventoryItemId: {
          not: null
        }
      },
      include: {
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
        },
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  async getByInventoryItem(inventoryItemId: string): Promise<OrderAdditiveWithRelations[]> {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${inventoryItemId} not found`);
    }

    return this.prisma.orderAdditive.findMany({
      where: {
        inventoryItemId
      },
      include: {
        network: true,
        inventoryItem: true,
        orders: {
          include: {
            order: true
          }
        }
      },
    });
  }

  // Вспомогательный метод для обновления общей суммы заказа
  private async updateOrderTotal(orderId: string): Promise<void> {
    try {
      const orderAdditives = await this.prisma.orderOrderAdditive.findMany({
        where: { orderId },
        select: {
          price: true,
          quantity: true
        }
      });

      const additivesTotal = orderAdditives.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      // Получаем текущую сумму заказа без модификаторов
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          items: {
            select: {
              price: true,
              quantity: true
            }
          },
          surcharges: {
            select: {
              amount: true
            }
          },
          discountAmount: true
        }
      });

      const itemsTotal = order?.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      ) || 0;

      const surchargesTotal = order?.surcharges.reduce(
        (sum, surcharge) => sum + surcharge.amount,
        0
      ) || 0;

      const newTotal = itemsTotal + additivesTotal + surchargesTotal - (order?.discountAmount || 0);

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: Math.round(newTotal)
        }
      });
    } catch (error) {
      this.logger.error(`Error updating order total: ${error.message}`);
      throw error;
    }
  }

  // Метод для применения модификатора заказа к заказу с учетом его типа
  async calculateAdditiveAmount(
    orderAdditive: OrderAdditive,
    order: any // Order с relations
  ): Promise<number> {
    switch (orderAdditive.type) {
      case OrderAdditiveType.FIXED:
        return orderAdditive.price;

      case OrderAdditiveType.PER_ITEM:
        const itemCount = order.items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        );
        return orderAdditive.price * itemCount;

      case OrderAdditiveType.PER_PERSON:
        const numberOfPeople = parseInt(order.numberOfPeople || '1');
        return orderAdditive.price * numberOfPeople;

      default:
        return orderAdditive.price;
    }
  }
}