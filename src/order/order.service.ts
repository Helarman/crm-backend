import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { DiscountTargetType, EnumOrderItemStatus, EnumOrderStatus, EnumPaymentStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateAttentionFlagsDto } from './dto/update-attention-flags.dto';
import { PaginatedResponse } from './dto/paginated-response.dto';

function timeStringToISODate(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
    const { restaurant, products, additives, productPrices } = await this.validateOrderData(dto);

    const stopListProducts = this.checkStopList(products, productPrices);
    if (stopListProducts.length > 0) {
      throw new BadRequestException(
        `Следующие продукты в стоп-листе: ${stopListProducts.join(', ')}`
      );
    }

    const orderNumber = await this.generateOrderNumber(dto.restaurantId);

    let deliveryPrice = 0;
    if (dto.type === "DELIVERY" && dto.deliveryZone) {
      deliveryPrice = dto.deliveryZone.price;
    }

    const baseAmount = this.calculateOrderTotal(dto.items, additives, productPrices);
    const surchargesAmount = this.calculateSurchargesTotal(dto.surcharges || [], baseAmount + deliveryPrice);
    const totalAmount = baseAmount + deliveryPrice + surchargesAmount;

    const order = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          status: EnumOrderStatus.CREATED,
          source: dto.source,
          number: orderNumber,
          customer: dto.customerId ? { connect: { id: dto.customerId } } : undefined,
          restaurant: { connect: { id: dto.restaurantId } },
          shift: dto.shiftId ? { connect: { id: dto.shiftId } } : undefined,
          type: dto.type,
          scheduledAt: dto.scheduledAt ? `${dto.scheduledAt}:00.000Z` : undefined,
          totalAmount: totalAmount,
          numberOfPeople: dto.numberOfPeople.toString(),
          comment: dto.comment,
          tableNumber: dto.tableNumber ? dto.tableNumber.toString() : undefined,
          deliveryAddress: dto.deliveryAddress,
          deliveryTime: dto.deliveryTime ? dto.deliveryTime : undefined,
          deliveryNotes: dto.deliveryNotes,
          items: {
            create: dto.items.map(item => ({
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              price: productPrices.find(pp => pp.productId === item.productId)?.price || 0,
              comment: item.comment,
              status: EnumOrderItemStatus.CREATED,
              additives: item.additiveIds
                ? { connect: item.additiveIds.map(id => ({ id })) }
                : undefined,
            })),
          },
          surcharges: dto.surcharges?.length ? {
            create: dto.surcharges.map(surcharge => ({
              surcharge: { connect: { id: surcharge.surchargeId } },
              amount: surcharge.amount,
              description: surcharge.description,
            })),
          } : undefined,
        },
        include: this.getOrderInclude(),
      });

      if (dto.payment) {
        await prisma.payment.create({
          data: {
            order: { connect: { id: order.id } },
            amount: order.totalAmount,
            method: dto.payment.method,
            status: EnumPaymentStatus.PENDING,
            externalId: dto.payment.externalId,
          },
        });
      }

      return order;
    });

    return this.mapToResponse(order);
  }

  async findById(id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });
    
    if (!order) throw new NotFoundException('Заказ не найден');
    
    const response = this.mapToResponse(order);
    
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: order.restaurant?.legalInfo,
        network: order.restaurant?.network ? {
          id: order.restaurant.network.id,
          name: order.restaurant.network.name,
          tenant: order.restaurant.network.tenant ? {
            domain: order.restaurant.network.tenant.domain,
            subdomain: order.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async findByRestaurantId(restaurantId: string): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { restaurantId },
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return orders.map(order => {
      const response = this.mapToResponse(order);
      return {
        ...response,
        restaurant: {
          ...response.restaurant,
          legalInfo: order.restaurant?.legalInfo,
          network: order.restaurant?.network ? {
            id: order.restaurant.network.id,
            name: order.restaurant.network.name,
            tenant: order.restaurant.network.tenant ? {
              domain: order.restaurant.network.tenant.domain,
              subdomain: order.restaurant.network.tenant.subdomain
            } : undefined
          } : undefined
        }
      };
    });
  }

  async getActiveRestaurantOrders(restaurantId: string): Promise<OrderResponse[]> {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const orders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          notIn: [EnumOrderStatus.CANCELLED, EnumOrderStatus.COMPLETED],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    return orders.map(order => {
      const response = this.mapToResponse(order);
      return {
        ...response,
        restaurant: {
          ...response.restaurant,
          legalInfo: order.restaurant?.legalInfo,
          network: order.restaurant?.network ? {
            id: order.restaurant.network.id,
            name: order.restaurant.network.name,
            tenant: order.restaurant.network.tenant ? {
              domain: order.restaurant.network.tenant.domain,
              subdomain: order.restaurant.network.tenant.subdomain
            } : undefined
          } : undefined
        }
      };
    });
  }

  async getRestaurantArchive(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    filters: {
      startDate?: Date;
      endDate?: Date;
      isReordered?: boolean;
      hasDiscount?: boolean;
      discountCanceled?: boolean;
      isRefund?: boolean;
      status?: EnumOrderStatus[];
      searchQuery?: string;
    } = {}
  ): Promise<PaginatedResponse<OrderResponse>> {
    const where: any = {
      restaurantId,
    };

    where.status = filters.status?.length 
      ? { in: filters.status }
      : { in: [EnumOrderStatus.COMPLETED, EnumOrderStatus.CANCELLED] };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.isReordered !== undefined) {
      where.isReordered = filters.isReordered;
    }
    if (filters.hasDiscount !== undefined) {
      where.hasDiscount = filters.hasDiscount;
    }
    if (filters.discountCanceled !== undefined) {
      where.discountCanceled = filters.discountCanceled;
    }
    if (filters.isRefund !== undefined) {
      where.isRefund = filters.isRefund;
    }

    if (filters.searchQuery) {
      where.OR = [
        { number: { contains: filters.searchQuery, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: filters.searchQuery, mode: 'insensitive' }
          }
        }
      ];
    }

    const total = await this.prisma.order.count({ where });

    const orders = await this.prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    return {
      data: orders.map(order => {
        const response = this.mapToResponse(order);
        return {
          ...response,
          restaurant: {
            ...response.restaurant,
            legalInfo: order.restaurant?.legalInfo,
            network: order.restaurant?.network ? {
              id: order.restaurant.network.id,
              name: order.restaurant.network.name,
              tenant: order.restaurant.network.tenant ? {
                domain: order.restaurant.network.tenant.domain,
                subdomain: order.restaurant.network.tenant.subdomain
              } : undefined
            } : undefined
          }
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Заказ не найден');

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async updateOrderItemStatus(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemStatusDto
  ): Promise<OrderResponse> {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: { order: true },
    });

    if (!item) throw new NotFoundException('Элемент заказа не найден');

    const now = new Date();
    const updateData: any = { status: dto.status };

    switch (dto.status) {
      case EnumOrderItemStatus.IN_PROGRESS:
        updateData.startedAt = now;
        if (dto.userId) {
          updateData.assignedToId = dto.userId;
        }
        break;
      case EnumOrderItemStatus.COMPLETED:
        updateData.completedAt = now;
        break;
      case EnumOrderItemStatus.CANCELLED:
        updateData.cancelledAt = now;
        break;
      case EnumOrderItemStatus.PAUSED:
        updateData.pausedAt = now;
        break;
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const updatedOrder = await this.checkAndUpdateOrderStatus(item.order);
    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async bulkUpdateOrderItemsStatus(
    orderId: string,
    dto: BulkUpdateOrderItemsStatusDto
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Заказ не найден');

    const invalidItems = dto.itemIds.filter(id =>
      !order.items.some(i => i.id === id)
    );

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `Элементы не найдены в заказе: ${invalidItems.join(', ')}`
      );
    }

    const updateData: any = { status: dto.status };
    if (dto.status === EnumOrderItemStatus.IN_PROGRESS && dto.userId) {
      updateData.assignedToId = dto.userId;
      updateData.startedAt = new Date();
    }
    if (dto.status === EnumOrderItemStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.prisma.orderItem.updateMany({
      where: { id: { in: dto.itemIds } },
      data: updateData,
    });

    const updatedOrder = await this.checkAndUpdateOrderStatus(order);
    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async addItemToOrder(orderId: string, dto: AddItemToOrderDto): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }, 
        payment: true,
        items: {
          where: {
            status: {
              not: 'CANCELLED'
            }
          }
        }
      },
    });

    if (!order || !order.restaurant) {
      throw new NotFoundException('Заказ или ресторан не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя добавить позицию в оплаченный заказ');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Продукт с ID ${dto.productId} не найден`);
    }

    const productInRestaurant = await this.prisma.product.count({
      where: {
        id: dto.productId,
        restaurants: { some: { id: order.restaurant.id } }
      }
    });

    if (!productInRestaurant) {
      throw new BadRequestException(
        `Продукт "${product.title}" не доступен в ресторане "${order.restaurant.title}"`
      );
    }

    let productPrice = await this.prisma.restaurantProductPrice.findFirst({
      where: {
        productId: dto.productId,
        restaurantId: order.restaurant.id,
      },
    });

    if (!productPrice) {
      productPrice = await this.prisma.restaurantProductPrice.create({
        data: {
          productId: dto.productId,
          restaurantId: order.restaurant.id,
          price: product.price, 
          isStopList: false
        }
      });
    }

    if (productPrice.isStopList) {
      throw new BadRequestException(
        `Продукт "${product.title}" в стоп-листе ресторана "${order.restaurant.title}"`
      );
    }

    const additives = dto.additiveIds?.length 
      ? await this.prisma.additive.findMany({
          where: { id: { in: dto.additiveIds } }
        })
      : [];

    if (dto.additiveIds?.length && additives.length !== dto.additiveIds.length) {
      const missingIds = dto.additiveIds.filter(id => 
        !additives.some(a => a.id === id)
      );
      throw new NotFoundException(
        `Не найдены добавки с ID: ${missingIds.join(', ')}`
      );
    }

    const additivesPrice = additives.reduce((sum, a) => sum + a.price, 0);
    const itemPrice = (productPrice.price + additivesPrice) * dto.quantity;

    const hasConfirmedItems = order.items.some(item => 
      item.status !== 'CREATED' && item.status !== 'CANCELLED'
    );

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      if (hasConfirmedItems) {
        await prisma.order.update({
          where: { id: orderId },
          data: { isReordered: true },
        });
      }

      const newItem = await prisma.orderItem.create({
        data: {
          order: { connect: { id: orderId } },
          product: { connect: { id: dto.productId } },
          quantity: dto.quantity,
          price: productPrice.price,
          comment: dto.comment,
          status: 'CREATED',
          isReordered: hasConfirmedItems,
          additives: dto.additiveIds?.length 
            ? { connect: dto.additiveIds.map(id => ({ id })) }
            : undefined,
        },
      });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { 
          totalAmount: { increment: itemPrice },
          status: order.status === 'COMPLETED' ? 'CONFIRMED' : order.status,
        },
        include: {
          ...this.getOrderInclude(),
          restaurant: {
            include: {
              network: {
                include: {
                  tenant: true
                }
              }
            }
          }
        },
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: itemPrice } },
        });
      }

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async updateOrderItem(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          where: { id: itemId },
          include: { additives: true }
        },
        payment: true,
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const item = order.items[0];
    if (!item) {
      throw new NotFoundException('Позиция заказа не найдена');
    }

    if (item.status !== 'REFUNDED') {
      throw new BadRequestException(
        'Можно редактировать только возвращенные позиции'
      );
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя редактировать позиции в оплаченном заказе');
    }

    let additives: any[] = [];
    if (dto.additiveIds?.length) {
      additives = await this.prisma.additive.findMany({
        where: { id: { in: dto.additiveIds } }
      });

      if (additives.length !== dto.additiveIds.length) {
        const missingIds = dto.additiveIds.filter(id => 
          !additives.some(a => a.id === id)
        );
        throw new NotFoundException(
          `Не найдены добавки с ID: ${missingIds.join(', ')}`
        );
      }
    }

    const productPrice = await this.prisma.restaurantProductPrice.findFirst({
      where: {
        productId: item.productId,
        restaurantId: order.restaurantId,
      },
    });

    if (!productPrice) {
      throw new NotFoundException('Цена продукта не найдена');
    }

    const oldAdditivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const newAdditivesPrice = additives.reduce((sum, a) => sum + a.price, 0);
    
    const oldItemPrice = (productPrice.price + oldAdditivesPrice) * item.quantity;
    const newItemPrice = (productPrice.price + newAdditivesPrice) * item.quantity;
    const priceDifference = newItemPrice - oldItemPrice;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: {
          comment: dto.comment !== undefined ? dto.comment : item.comment,
          additives: dto.additiveIds !== undefined 
            ? { set: dto.additiveIds.map(id => ({ id })) }
            : undefined,
        },
      });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { 
          totalAmount: { increment: priceDifference },
        },
        include: {
          ...this.getOrderInclude(),
          restaurant: {
            include: {
              network: {
                include: {
                  tenant: true
                }
              }
            }
          }
        },
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: priceDifference } },
        });
      }

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async removeItemFromOrder(orderId: string, itemId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          where: { id: itemId },
          include: { 
            additives: true,
            product: true 
          }
        },
        payment: true,
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const item = order.items[0];
    if (!item) {
      throw new NotFoundException('Позиция заказа не найдена');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя удалить позицию из оплаченного заказа');
    }

    const additivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const itemTotalPrice = (item.price + additivesPrice) * item.quantity;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.orderItem.delete({
        where: { id: itemId },
      });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { 
          totalAmount: { decrement: itemTotalPrice },
        },
        include: {
          ...this.getOrderInclude(),
          restaurant: {
            include: {
              network: {
                include: {
                  tenant: true
                }
              }
            }
          }
        },
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: itemTotalPrice } },
        });
      }

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async applyDiscountToOrder(orderId: string, discountId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        products: true,
        restaurants: { where: { restaurantId: order.restaurantId } }
      }
    });

    if (!discount) {
      throw new NotFoundException('Скидка не найдена');
    }

    // Проверка доступности скидки для ресторана
    if (discount.restaurants.length === 0 && discount.targetType !== 'ALL') {
      throw new BadRequestException('Скидка не доступна для этого ресторана');
    }

    // Проверка минимальной суммы заказа
    if (discount.minOrderAmount && order.totalAmount < discount.minOrderAmount) {
      throw new BadRequestException(
        `Минимальная сумма заказа для скидки: ${discount.minOrderAmount}`
      );
    }

    // Проверка времени действия скидки
    const now = new Date();
    if (discount.startDate && new Date(discount.startDate) > now) {
      throw new BadRequestException('Скидка еще не началась');
    }

    if (discount.endDate && new Date(discount.endDate) < now) {
      throw new BadRequestException('Скидка уже закончилась');
    }

    // Проверка времени суток
    if (discount.startTime !== null && discount.endTime !== null) {
      const currentHour = now.getHours();
      if (currentHour < discount.startTime || currentHour >= discount.endTime) {
        throw new BadRequestException(
          `Скидка доступна с ${discount.startTime}:00 до ${discount.endTime}:00`
        );
      }
    }

    // Проверка лимита использований
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      throw new BadRequestException('Лимит использований скидки исчерпан');
    }

    // Расчет суммы скидки
    let discountAmount = 0;
    let discountApplicationDescription = '';

    if (discount.targetType === DiscountTargetType.PRODUCT && discount.products.length > 0) {
      // Скидка на конкретные продукты
      const productIds = discount.products.map(p => p.productId);
      const applicableItems = order.items.filter(item => 
        productIds.includes(item.productId) && 
        !item.isRefund
      );

      for (const item of applicableItems) {
        const itemDiscount = discount.type === 'PERCENTAGE'
          ? Math.floor((item.price * item.quantity * discount.value) / 100)
          : discount.value * item.quantity;

        discountAmount += itemDiscount;
      }

      discountApplicationDescription = `Скидка "${discount.title}" применена к ${applicableItems.length} позициям`;
    } else {
      // Скидка на весь заказ
      discountAmount = discount.type === 'PERCENTAGE'
        ? Math.floor((order.totalAmount * discount.value) / 100)
        : discount.value;

      discountApplicationDescription = `Скидка "${discount.title}" применена ко всему заказу`;
    }

    if (discountAmount <= 0) {
      throw new BadRequestException('Сумма скидки должна быть больше 0');
    }

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Создаем запись о применении скидки
      await prisma.discountApplication.create({
        data: {
          discount: { connect: { id: discountId } },
          order: { connect: { id: orderId } },
          amount: discountAmount,
          description: discountApplicationDescription,
        },
      });

      // Обновляем счетчик использований скидки
      await prisma.discount.update({
        where: { id: discountId },
        data: { currentUses: { increment: 1 } },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: discountAmount },
          discountAmount: { increment: discountAmount },
          hasDiscount: true,
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: discountAmount } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async removeDiscountFromOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        payment: true,
        discountApplications: {
          include: { discount: true }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.hasDiscount) {
      return this.mapToResponse(order);
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    const discountAmount = order.discountAmount;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Уменьшаем счетчики использований скидок
      for (const application of order.discountApplications) {
        await prisma.discount.update({
          where: { id: application.discountId },
          data: { currentUses: { decrement: 1 } },
        });
      }

      // Удаляем все применения скидок для этого заказа
      await prisma.discountApplication.deleteMany({
        where: { orderId },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { increment: discountAmount },
          discountAmount: 0,
          hasDiscount: false,
          discountCanceled: true,
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: discountAmount } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async refundOrderItem(
    orderId: string,
    itemId: string,
    reason: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          where: { id: itemId },
          include: { additives: true }
        },
        payment: true,
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const item = order.items[0];
    if (!item) {
      throw new NotFoundException('Позиция заказа не найдена');
    }

    if (item.isRefund) {
      throw new BadRequestException('Этот товар уже был возвращен');
    }

    const additivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const itemTotalPrice = (item.price + additivesPrice) * item.quantity;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { 
          isRefund: true,
          refundReason: reason,
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { 
          totalAmount: { decrement: itemTotalPrice },
          isRefund: true,
        },
        include: {
          ...this.getOrderInclude(),
          restaurant: {
            include: {
              network: {
                include: {
                  tenant: true
                }
              }
            }
          }
        },
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: itemTotalPrice } },
        });
      }

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async updateOrder(id: string, dto: UpdateOrderDto): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { 
        payment: true,
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    const updateData: any = {
      type: dto.type,
      numberOfPeople: dto.numberOfPeople?.toString(),
      tableNumber: dto.tableNumber?.toString(),
      comment: dto.comment,
      deliveryAddress: dto.deliveryAddress,
      deliveryTime: dto.deliveryTime ? timeStringToISODate(dto.deliveryTime) : undefined,
      deliveryNotes: dto.deliveryNotes,
      scheduledAt: dto.scheduledAt ? `${dto.scheduledAt}:00.000Z` : undefined,
    };

    if (dto.customerId !== undefined) {
      if (dto.customerId) {
        const customerExists = await this.prisma.customer.count({
          where: { id: dto.customerId },
        });
        if (!customerExists) {
          throw new NotFoundException('Клиент не найден');
        }
        updateData.customer = { connect: { id: dto.customerId } };
      } else {
        updateData.customer = { disconnect: true };
      }
    }

    if (dto.customerPhone) {
      updateData.customerPhone = dto.customerPhone;
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  async updateAttentionFlags(
    id: string,
    dto: UpdateAttentionFlagsDto
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const updateData: any = {};
    if (dto.isReordered !== undefined) updateData.isReordered = dto.isReordered;
    if (dto.hasDiscount !== undefined) updateData.hasDiscount = dto.hasDiscount;
    if (dto.discountCanceled !== undefined) updateData.discountCanceled = dto.discountCanceled;
    if (dto.isPrecheck !== undefined) updateData.isPrecheck = dto.isPrecheck;
    if (dto.isRefund !== undefined) updateData.isRefund = dto.isRefund;

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        ...this.getOrderInclude(),
        restaurant: {
          include: {
            network: {
              include: {
                tenant: true
              }
            }
          }
        }
      },
    });

    const response = this.mapToResponse(updatedOrder);
    return {
      ...response,
      restaurant: {
        ...response.restaurant,
        legalInfo: updatedOrder.restaurant?.legalInfo,
        network: updatedOrder.restaurant?.network ? {
          id: updatedOrder.restaurant.network.id,
          name: updatedOrder.restaurant.network.name,
          tenant: updatedOrder.restaurant.network.tenant ? {
            domain: updatedOrder.restaurant.network.tenant.domain,
            subdomain: updatedOrder.restaurant.network.tenant.subdomain
          } : undefined
        } : undefined
      }
    };
  }

  private async generateOrderNumber(restaurantId: string): Promise<string> {
    const dateStr = new Date()
      .toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
      .replace(/\./g, '');

    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const number = `${dateStr}-${randomPart}`;

    const exists = await this.prisma.order.findUnique({ where: { number } });
    if (exists) return this.generateOrderNumber(restaurantId);

    return number;
  }

  private async checkAndUpdateOrderStatus(order: any): Promise<any> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId: order.id },
    });

    let newStatus: EnumOrderStatus | null = null;

    if (items.every(i => i.status === EnumOrderItemStatus.COMPLETED)) {
      newStatus = EnumOrderStatus.READY;
    } else if (items.some(i => i.status === EnumOrderItemStatus.IN_PROGRESS)) {
      newStatus = EnumOrderStatus.PREPARING;
    }

    if (newStatus && newStatus !== order.status) {
      return this.prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
        include: {
          ...this.getOrderInclude(),
          restaurant: {
            include: {
              network: {
                include: {
                  tenant: true
                }
              }
            }
          }
        },
      });
    }

    return order;
  }

  private isValidStatusTransition(
    currentStatus: EnumOrderStatus,
    newStatus: EnumOrderStatus
  ): boolean {
    const transitions = {
      [EnumOrderStatus.CREATED]: [
        EnumOrderStatus.CONFIRMED,
        EnumOrderStatus.CANCELLED,
      ],
      [EnumOrderStatus.CONFIRMED]: [
        EnumOrderStatus.PREPARING,
        EnumOrderStatus.CANCELLED,
      ],
      [EnumOrderStatus.PREPARING]: [
        EnumOrderStatus.READY,
        EnumOrderStatus.CANCELLED,
      ],
      [EnumOrderStatus.READY]: [
        EnumOrderStatus.DELIVERING,
        EnumOrderStatus.COMPLETED,
      ],
      [EnumOrderStatus.DELIVERING]: [EnumOrderStatus.COMPLETED],
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  private isValidItemStatusTransition(
    currentStatus: EnumOrderItemStatus,
    newStatus: EnumOrderItemStatus
  ): boolean {
    const transitions = {
      [EnumOrderItemStatus.CREATED]: [
        EnumOrderItemStatus.IN_PROGRESS,
        EnumOrderItemStatus.CANCELLED,
      ],
      [EnumOrderItemStatus.IN_PROGRESS]: [
        EnumOrderItemStatus.PARTIALLY_DONE,
        EnumOrderItemStatus.PAUSED,
        EnumOrderItemStatus.COMPLETED,
        EnumOrderItemStatus.CANCELLED,
      ],
      [EnumOrderItemStatus.PARTIALLY_DONE]: [
        EnumOrderItemStatus.IN_PROGRESS,
        EnumOrderItemStatus.COMPLETED,
      ],
      [EnumOrderItemStatus.PAUSED]: [
        EnumOrderItemStatus.IN_PROGRESS,
        EnumOrderItemStatus.CANCELLED,
      ],
      [EnumOrderItemStatus.COMPLETED]: [],
      [EnumOrderItemStatus.CANCELLED]: [],
    };

    return transitions[currentStatus]?.includes(newStatus) || false;
  }

  private async validateOrderData(dto: CreateOrderDto) {
    const [restaurant, products, additives, productPrices] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: dto.restaurantId },
      }),
      this.prisma.product.findMany({
        where: { id: { in: dto.items.map(item => item.productId) } },
      }),
      this.prisma.additive.findMany({
        where: { id: { in: dto.items.flatMap(item => item.additiveIds || []) } },
      }),
      this.prisma.restaurantProductPrice.findMany({
        where: {
          productId: { in: dto.items.map(item => item.productId) },
          restaurantId: dto.restaurantId,
        },
      }),
    ]);

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    if (dto.customerId) {
      const customerExists = await this.prisma.customer.count({
        where: { id: dto.customerId },
      });
      if (!customerExists) {
        throw new NotFoundException('Клиент не найден');
      }
    }

    if (dto.shiftId) {
      const shiftExists = await this.prisma.shift.count({
        where: { id: dto.shiftId, restaurantId: dto.restaurantId },
      });
      if (!shiftExists) {
        throw new NotFoundException('Смена не найдена или не принадлежит ресторану');
      }
    }

    const missingProducts = dto.items
      .filter(item => !products.some(p => p.id === item.productId))
      .map(item => item.productId);

    if (missingProducts.length > 0) {
      throw new NotFoundException(`Продукты не найдены: ${missingProducts.join(', ')}`);
    }

    const allAdditiveIds = dto.items.flatMap(item => item.additiveIds || []);
    const missingAdditives = allAdditiveIds
      .filter(id => !additives.some(a => a.id === id));

    if (missingAdditives.length > 0) {
      throw new NotFoundException(`Добавки не найдены: ${missingAdditives.join(', ')}`);
    }

    return { restaurant, products, additives, productPrices };
  }

  private checkStopList(
    products: { id: string; title: string }[],
    productPrices: { productId: string; isStopList: boolean }[]
  ): string[] {
    return productPrices
      .filter(pp => pp.isStopList)
      .map(pp => {
        const product = products.find(p => p.id === pp.productId);
        return product?.title || pp.productId;
      });
  }

  private calculateOrderTotal(
    items: CreateOrderDto['items'],
    additives: { id: string; price: number }[],
    productPrices: { productId: string; price: number }[]
  ): number {
    return items.reduce((sum, item) => {
      const productPrice = productPrices.find(pp => pp.productId === item.productId)?.price || 0;
      const itemAdditives = additives.filter(a => item.additiveIds?.includes(a.id));
      const additivesPrice = itemAdditives.reduce((aSum, a) => aSum + a.price, 0);
      return sum + (productPrice + additivesPrice) * item.quantity;
    }, 0);
  }

  private calculateSurchargesTotal(
    surcharges: { amount: number; type: 'FIXED' | 'PERCENTAGE' }[],
    baseAmount: number
  ): number {
    return surcharges.reduce((total, surcharge) => {
      if (surcharge.type === 'FIXED') {
        return total + surcharge.amount;
      } else {
        return total + (baseAmount * surcharge.amount) / 100;
      }
    }, 0);
  }

  private getOrderInclude() {
    return {
      items: {
        include: {
          additives: true,
          product: {
            include: {
              category: true,
              restaurantPrices: {
                select: {
                  price: true,
                  isStopList: true
                }
              },
              additives: true,
              ingredients: {
                include: {
                  inventoryItem: true 
                }
              },
              workshops: {
                include: {
                  workshop: true 
                }
              },
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      customer: true,
      restaurant: true,
      shift: true,
      payment: true,
      surcharges: {
        include: {
          surcharge: true
        }
      }
    };
  }

  private mapToResponse(order: any): OrderResponse {
    const itemsWithTotals = order.items?.map((item: any) => ({
      ...item,
      totalPrice: (item.price + (item.additives?.reduce((sum: number, a: any) => sum + a.price, 0) || 0)) * item.quantity,
      isReordered: item.isReordered,
      isRefund: item.isRefund,
      refundReason: item.refundReason,
      timestamps: {
        createdAt: item.createdAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        pausedAt: item.pausedAt,
        refundedAt: item.refundedAt,
      }
    })) || [];

    const totalPrice = itemsWithTotals.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const totalItems = itemsWithTotals.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      source: order.source,
      type: order.type,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      scheduledAt: order.scheduledAt,
      comment: order.comment,
      tableNumber: order.tableNumber,
      numberOfPeople: order.numberOfPeople,
      totalPrice,
      totalAmount: order.totalAmount,
      bonusPointsUsed: order.bonusPointsUsed,
      discountAmount: order.discountAmount,
      totalItems,
      restaurantId: order.restaurantId,
      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        bonusPoints: order.customer.bonusPoints,
        personalDiscount: order.customer.personalDiscount
      } : undefined,
      restaurant: {
        id: order.restaurant?.id,
        name: order.restaurant?.name,
        address: order.restaurant?.address,
      },
      items: itemsWithTotals.map(item => ({
        id: item.id,
        status: item.status,
        isReordered: item.isReordered,
        timestamps: item.timestamps,
        isRefund: item.isRefund,
        refundReason: item.refundReason,
        assignedTo: item.assignedTo ? {
          id: item.assignedTo.id,
          name: item.assignedTo.name,
        } : null,
        product: {
          id: item.product.id,
          title: item.product.title,
          price: item.price,
          image: item.product.images?.[0],
          workshops: item.product.workshops,
          ingredients: item.product.ingredients,
          restaurantPrices: item.product.restaurantPrices,
        },
        quantity: item.quantity,
        comment: item.comment,
        additives: item.additives?.map(additive => ({
          id: additive.id,
          title: additive.title,
          price: additive.price,
        })) || [],
      })),
      payment: order.payment ? {
        id: order.payment.id,
        method: order.payment.method,
        amount: order.payment.amount,
        status: order.payment.status,
        externalId: order.payment.externalId,
      } : undefined,
      delivery: order.deliveryAddress ? {
        address: order.deliveryAddress,
        time: order.deliveryTime,
        notes: order.deliveryNotes,
      } : undefined,
      surcharges: order.surcharges?.map(s => ({
        id: s.id,
        surchargeId: s.surchargeId,
        title: s.surcharge?.title || s.description || 'Надбавка',
        amount: s.amount,
        type: s.surcharge?.type || 'FIXED',
        description: s.description
      })) || [],
      attentionFlags: {
        isReordered: order.isReordered,
        hasDiscount: order.hasDiscount,
        discountCanceled: order.discountCanceled,
        isPrecheck: order.isPrecheck,
        isRefund: order.isRefund,
      },
    };
  }
   async applyCustomerToOrder(
    orderId: string,
    customerId: string
  ): Promise<OrderResponse> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        customer: { connect: { id: customerId } },
      },
      include: this.getOrderInclude(),
    });

    return this.mapToResponse(order);
  }

  async applyCustomerDiscount(
    orderId: string,
    discountId: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    const discount = await this.prisma.discount.findUnique({
      where: { id: discountId },
      include: {
        restaurants: { where: { restaurantId: order.restaurantId } },
      },
    });

    if (!discount) {
      throw new NotFoundException('Скидка не найдена');
    }

    if (discount.restaurants.length === 0 && discount.targetType !== 'ALL') {
      throw new BadRequestException(
        'Скидка не доступна для этого ресторана'
      );
    }

    let discountAmount = 0;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = Math.floor(
        (order.totalAmount * discount.value) / 100
      );
    } else {
      discountAmount = discount.value;
    }

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Создаем запись о применении скидки
      await prisma.discountApplication.create({
        data: {
          discount: { connect: { id: discountId } },
          order: { connect: { id: orderId } },
          customer: { connect: { id: order.customerId! } },
          amount: discountAmount,
          description: `Скидка "${discount.title}" применена`,
        },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: discountAmount },
          discountAmount: { increment: discountAmount },
          hasDiscount: true,
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: discountAmount } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async applyCustomerPoints(
    orderId: string,
    points: number
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    if (points > order.customer.bonusPoints) {
      throw new BadRequestException(
        'Недостаточно бонусных баллов у клиента'
      );
    }

    // Конвертируем баллы в рубли (например, 1 балл = 1 рубль)
    const pointsValue = points;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Создаем транзакцию списания баллов
      await prisma.bonusTransaction.create({
        data: {
          customer: { connect: { id: order.customerId! } },
          order: { connect: { id: orderId } },
          amount: -points,
          description: `Списание ${points} баллов для заказа #${order.number}`,
        },
      });

      // Обновляем баланс клиента
      await prisma.customer.update({
        where: { id: order.customerId! },
        data: { bonusPoints: { decrement: points } },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: pointsValue },
          bonusPointsUsed: { increment: points },
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: pointsValue } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async removeCustomerPoints(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    if (order.bonusPointsUsed <= 0) {
      return this.mapToResponse(order);
    }

    const pointsToReturn = order.bonusPointsUsed;
    const pointsValue = pointsToReturn; // 1 балл = 1 рубль

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Создаем транзакцию возврата баллов
      await prisma.bonusTransaction.create({
        data: {
          customer: { connect: { id: order.customerId! } },
          order: { connect: { id: orderId } },
          amount: pointsToReturn,
          description: `Возврат ${pointsToReturn} баллов для заказа #${order.number}`,
        },
      });

      // Обновляем баланс клиента
      await prisma.customer.update({
        where: { id: order.customerId! },
        data: { bonusPoints: { increment: pointsToReturn } },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { increment: pointsValue },
          bonusPointsUsed: 0,
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: pointsValue } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

   async removeCustomerFromOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    // Если есть примененные бонусы - сначала их убираем
    if (order.bonusPointsUsed > 0) {
      await this.removeCustomerPoints(orderId);
    }

    // Если есть примененные скидки - убираем их
    if (order.hasDiscount) {
      await this.removeCustomerDiscount(orderId);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        customer: { disconnect: true },
      },
      include: this.getOrderInclude(),
    });

    return this.mapToResponse(updatedOrder);
  }

  async removeCustomerDiscount(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, discountApplications: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.hasDiscount) {
      return this.mapToResponse(order);
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    const discountAmount = order.discountAmount;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Удаляем все применения скидок для этого заказа
      await prisma.discountApplication.deleteMany({
        where: { orderId },
      });

      // Обновляем заказ
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { increment: discountAmount },
          discountAmount: 0,
          hasDiscount: false,
          discountCanceled: true,
        },
        include: this.getOrderInclude(),
      });

      // Обновляем платеж, если он есть
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: discountAmount } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async applyCustomerPersonalDiscount(orderId: string): Promise<OrderResponse> {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, payment: true }
  });

  if (!order?.customer) {
    throw new BadRequestException('К заказу не привязан клиент');
  }

  if (!order.customer.personalDiscount || order.customer.personalDiscount <= 0) {
    throw new BadRequestException('У клиента нет персональной скидки');
  }

  const discountValue = order.customer.personalDiscount;
  const discountAmount = Math.floor(order.totalAmount * discountValue / 100);

  const updatedOrder = await this.prisma.$transaction(async (prisma) => {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: { decrement: discountAmount },
        discountAmount: { increment: discountAmount },
        hasDiscount: true,
      },
      include: this.getOrderInclude(),
    });

    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { amount: { decrement: discountAmount } },
      });
    }

    return updated;
  });

  return this.mapToResponse(updatedOrder);
}
}