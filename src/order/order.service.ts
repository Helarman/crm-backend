import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { DiscountTargetType, EnumOrderItemStatus, EnumOrderStatus, EnumPaymentMethod, EnumPaymentStatus, OrderAdditiveType } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateAttentionFlagsDto } from './dto/update-attention-flags.dto';
import { PaginatedResponse } from './dto/paginated-response.dto';
import { OrderGateway } from './order.gateway';
import { CustomerService } from 'src/customer/customer.service';
import { OrderAdditiveService } from 'src/order-additive/order-additive.service';

function timeStringToISODate(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

@Injectable()
export class OrderService {
  @Inject(OrderGateway)
  private readonly orderGateway: OrderGateway;

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyaltyService: CustomerService,
    @Inject(forwardRef(() => OrderAdditiveService))
    private readonly orderAdditiveService: OrderAdditiveService
  ) { }

  private async validateAndAssignTable(
    tableId: string,
    restaurantId: string,
    orderId?: string,
    orderType?: string
  ) {
    // Проверяем существование стола
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { hall: true },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    // Проверяем, что стол принадлежит тому же ресторану
    if (table.hall?.restaurantId !== restaurantId) {
      throw new ConflictException('Стол принадлежит другому ресторану');
    }

    // Проверяем доступность стола
    const isAvailable = await this.isTableAvailable(tableId, orderId);
    if (!isAvailable) {
      throw new ConflictException('Стол уже занят');
    }

    // Проверяем бронирования
    const now = new Date();
    const upcomingReservation = await this.prisma.reservation.findFirst({
      where: {
        tableId,
        status: 'CONFIRMED',
        reservationTime: {
          gte: now,
          lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 часа
        },
      },
    });

    if (upcomingReservation) {
      throw new ConflictException('На этот стол есть подтвержденная бронь в ближайшее время');
    }

    // Обновляем статус стола
    await this.prisma.table.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' },
    });

    return true;
  }

  // Метод проверки доступности стола
  private async isTableAvailable(tableId: string, excludeOrderId?: string): Promise<boolean> {
    const activeOrders = await this.prisma.order.findMany({
      where: {
        tableId,
        status: {
          in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
        },
        ...(excludeOrderId && { id: { not: excludeOrderId } }),
      },
    });

    return activeOrders.length === 0;
}

async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
  const { restaurant, products, additives, productPrices } = await this.getOrderData(dto);
  console.log(dto)
   const deliveryTime = dto.deliveryTime 
    ? new Date(dto.deliveryTime).toISOString() 
    : undefined;

  if (dto.tableId) {
    await this.validateAndAssignTable(dto.tableId, dto.restaurantId, null, dto.type);
  }

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

  let orderAdditivesInfo: any[] = [];
  const orderAdditivesData: any[] = [];

  if (dto.orderAdditives?.length) {
    const orderAdditives = await this.prisma.orderAdditive.findMany({
      where: {
        id: { in: dto.orderAdditives.map(oa => oa.orderAdditiveId) },
        isActive: true,
        orderTypes: { has: dto.type }
      }
    });

    orderAdditivesInfo = dto.orderAdditives.map(oaDto => {
      const additive = orderAdditives.find(a => a.id === oaDto.orderAdditiveId);
      return {
        additive,
        quantity: oaDto.quantity || 1
      };
    });

    for (const oaDto of dto.orderAdditives) {
      const additive = orderAdditives.find(a => a.id === oaDto.orderAdditiveId);
      if (additive) {
        orderAdditivesData.push({
          orderAdditiveId: additive.id,
          quantity: oaDto.quantity || 1,
          price: additive.price
        });
      }
    }
  }

  const baseAmount = await this.calculateOrderTotal(
    dto.items,
    additives,
    productPrices,
    orderAdditivesInfo,
    dto.type,
    dto.numberOfPeople
  );

  const surchargesAmount = this.calculateSurchargesTotal(dto.surcharges || [], baseAmount + deliveryPrice);
  const totalAmount = baseAmount + deliveryPrice + surchargesAmount;

  let personalDiscountAmount = 0;
  let personalDiscountId: string | null = null;

  if (dto.customerId && dto.restaurantId) {
    const personalDiscount = await this.loyaltyService.getPersonalDiscount(
      dto.customerId,
      dto.restaurantId
    );

    if (personalDiscount.discount > 0 && personalDiscount.isActive) {
      personalDiscountAmount = Math.floor(totalAmount * personalDiscount.discount / 100);
      personalDiscountId = personalDiscount.id;
    }
  }

  const finalTotalAmount = totalAmount - personalDiscountAmount;

  // Создаем заказ и платеж в одной операции
  const orderData: any = {
    status: EnumOrderStatus.CREATED,
    source: dto.source,
    number: orderNumber,
    customer: dto.customerId ? { connect: { id: dto.customerId } } : undefined,
    customerName: dto.customerName,
    phone: dto.phone,
    restaurant: { connect: { id: dto.restaurantId } },
    shift: dto.shiftId ? { connect: { id: dto.shiftId } } : undefined,
    type: dto.type,
    scheduledAt: dto.scheduledAt ? `${dto.scheduledAt}:00.000Z` : undefined,
    totalAmount: finalTotalAmount,
    discountAmount: personalDiscountAmount,
    hasDiscount: personalDiscountAmount > 0,
    numberOfPeople: dto.numberOfPeople.toString(),
    comment: dto.comment,
    tableNumber: dto.tableNumber ? dto.tableNumber.toString() : undefined,
    deliveryAddress: dto.deliveryAddress,
    deliveryTime: deliveryTime,  
    deliveryNotes: dto.deliveryNotes,
    deliveryEntrance: dto.deliveryEntrance,
    deliveryIntercom: dto.deliveryIntercom,
    deliveryFloor: dto.deliveryFloor,
    deliveryApartment: dto.deliveryApartment,
    deliveryCourierComment: dto.deliveryCourierComment,
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
    // Создаем платеж прямо здесь
    payment: {
      create: {
        amount: finalTotalAmount,
        method: EnumPaymentMethod.CASH,
        status: EnumPaymentStatus.PENDING,
      },
    },
  };

  // Добавляем модификаторы заказа, если они есть
  if (orderAdditivesData.length > 0) {
    orderData.orderOrderAdditives = {
      create: orderAdditivesData.map(data => ({
        orderAdditive: { connect: { id: data.orderAdditiveId } },
        quantity: data.quantity,
        price: data.price,
      })),
    };
  }

  if (personalDiscountId !== null) {
    orderData.personalDiscountId = personalDiscountId;
  }

  const order = await this.prisma.order.create({
    data: orderData,
    include: this.getOrderInclude(),
  });

  const response = this.mapToResponse(order);

  setTimeout(async () => {
    await this.orderGateway.notifyNewOrder(response);
  }, 100);

  return response;
}

  async addOrderAdditiveToOrder(
    orderId: string,
    orderAdditiveId: string,
    quantity: number = 1
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: { include: { network: true } },
        payment: true,
        items: true
      }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя добавить модификатор в оплаченный заказ');
    }

    // Используем метод из сервиса модификаторов заказа
    await this.orderAdditiveService.addToOrder(
      orderAdditiveId,
      orderId,
      quantity
    );

    // Получаем обновленный заказ
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.getOrderInclude(),
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  // Добавляем метод для удаления модификатора из заказа
  async removeOrderAdditiveFromOrder(
    orderId: string,
    orderAdditiveId: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя удалить модификатор из оплаченного заказа');
    }

    // Используем метод из сервиса модификаторов заказа
    await this.orderAdditiveService.removeFromOrder(orderAdditiveId, orderId);

    // Получаем обновленный заказ
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.getOrderInclude(),
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  // Добавляем метод для обновления модификаторов заказа
  async updateOrderAdditives(
    orderId: string,
    orderAdditiveIds: string[]
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить модификаторы в оплаченном заказе');
    }

    // Используем метод из сервиса модификаторов заказа
    await this.orderAdditiveService.updateOrderAdditives(orderId, orderAdditiveIds);

    // Получаем обновленный заказ
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.getOrderInclude(),
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
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

    // Отправляем WebSocket уведомление об изменении статуса
    setTimeout(async () => {
      await this.orderGateway.notifyOrderStatusUpdated(response);
    }, 100);

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


  async cancelAllActiveOrders(restaurantId: string): Promise<OrderResponse[]> {
    const activeOrders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          notIn: [EnumOrderStatus.CANCELLED, EnumOrderStatus.COMPLETED],
        },
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

    if (activeOrders.length === 0) {
      return [];
    }

    const updatedOrders = await this.prisma.$transaction(async (prisma) => {
      const orderIds = activeOrders.map(order => order.id);

      await prisma.order.updateMany({
        where: {
          id: { in: orderIds }
        },
        data: {
          status: EnumOrderStatus.CANCELLED,
          updatedAt: new Date()
        }
      });

      await prisma.orderItem.updateMany({
        where: {
          orderId: { in: orderIds }
        },
        data: {
          status: EnumOrderItemStatus.CANCELLED,
        }
      });

      return prisma.order.findMany({
        where: {
          id: { in: orderIds }
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
    });

    const responses = updatedOrders.map(order => {
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

    setTimeout(async () => {
      for (const response of responses) {
        await this.orderGateway.notifyOrderStatusUpdated(response);
      }
    }, 100);

    return responses;
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
        updateData.startedById = dto.userId;
        if (dto.userId) {
          updateData.assignedToId = dto.userId;
        }
        break;
      case EnumOrderItemStatus.COMPLETED:
        updateData.completedAt = now;
        updateData.completedById = dto.userId;
        break;
      case EnumOrderItemStatus.CANCELLED:
        updateData.cancelledAt = now;
        updateData.cancelledById = dto.userId;
        break;
      case EnumOrderItemStatus.PAUSED:
        updateData.pausedAt = now;
        updateData.pausedById = dto.userId;
        break;
      case EnumOrderItemStatus.REFUNDED:
        updateData.refundedAt = now;
        updateData.refundedById = dto.userId;
        break;
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const updatedOrder = await this.checkAndUpdateOrderStatus(item.order);
    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении статуса элемента
    setTimeout(async () => {
      await this.orderGateway.notifyOrderItemStatusUpdated(response, itemId);
    }, 100);

    return response;
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

    // Отправляем WebSocket уведомление о массовом обновлении статусов
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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
    console.log('1. Начало addItemToOrder');

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
        `Не найдены Модификаторы с ID: ${missingIds.join(', ')}`
      );
    }

    const additivesPrice = additives.reduce((sum, a) => sum + a.price, 0);
    const itemPrice = (productPrice.price + additivesPrice) * dto.quantity;

    const hasConfirmedItems = order.items.some(item =>
      item.status !== 'CREATED' && item.status !== 'CANCELLED'
    );


    try {
      if (hasConfirmedItems) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { isReordered: true },
        });
      }

      const newItem = await this.prisma.orderItem.create({
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

      const updatedOrder = await this.prisma.order.update({
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
        await this.prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: itemPrice } },
        });
      }


      const response = this.mapToResponse(updatedOrder);

      // WebSocket уведомление
      setTimeout(async () => {
        await this.orderGateway.notifyOrderModified(response);
      }, 100);

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

    } catch (error) {
      console.error('Ошибка при добавлении товара:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
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
          `Не найдены Модификаторы с ID: ${missingIds.join(', ')}`
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

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async updateOrderItemQuantity(
    orderId: string,
    itemId: string,
    newQuantity: number,
    userId?: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { id: itemId },
          include: { additives: true }
        },
        payment: true,
        restaurant: true
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');

    const item = order.items[0];
    if (!item) throw new NotFoundException('Позиция заказа не найдена');

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    if (newQuantity <= 0) {
      throw new BadRequestException('Количество должно быть больше 0');
    }

    const additivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const itemPricePerUnit = item.price + additivesPrice;
    const oldTotalPrice = itemPricePerUnit * item.quantity;
    const newTotalPrice = itemPricePerUnit * newQuantity;
    const priceDifference = newTotalPrice - oldTotalPrice;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: {
          quantity: newQuantity,
          // Помечаем как дозаказ если уменьшаем количество после подтверждения
          isReordered: item.status !== 'CREATED' && newQuantity < item.quantity
        },
      });

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { increment: priceDifference },
          isReordered: newQuantity < item.quantity // Флаг дозаказа
        },
        include: this.getOrderInclude(),
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: priceDifference } },
        });
      }

      // Логируем изменение
      await prisma.orderLog.create({
        data: {
          orderId,
          userId,
          action: 'UPDATE_QUANTITY',
          message: `Изменено количество с ${item.quantity} на ${newQuantity}"`,
          metadata: {
            itemId,
            oldQuantity: item.quantity,
            newQuantity,
            priceDifference
          }
        }
      });

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async partialRefundOrderItem(
    orderId: string,
    itemId: string,
    refundQuantity: number,
    reason: string,
    userId?: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { id: itemId },
          include: { additives: true }
        },
        payment: true,
        restaurant: true
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');

    const item = order.items[0];
    if (!item) throw new NotFoundException('Позиция заказа не найдена');

    if (refundQuantity <= 0 || refundQuantity > item.quantity) {
      throw new BadRequestException(
        `Количество для возврата должно быть от 1 до ${item.quantity}`
      );
    }

    const additivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const itemPricePerUnit = item.price + additivesPrice;
    const refundAmount = itemPricePerUnit * refundQuantity;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      if (refundQuantity === item.quantity) {
        // Полный возврат - используем существующий метод
        await prisma.orderItem.update({
          where: { id: itemId },
          data: {
            isRefund: true,
            refundReason: reason,
            status: 'REFUNDED',
            refundedAt: new Date(),
            refundedById: userId,
          },
        });
      } else {
        // Частичный возврат - создаем новую позицию для возврата
        const remainingQuantity = item.quantity - refundQuantity;

        // Обновляем текущую позицию
        await prisma.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: remainingQuantity,
            isReordered: true // Помечаем как измененную
          },
        });

        // Создаем позицию возврата
        await prisma.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            quantity: refundQuantity,
            price: item.price,
            comment: `Возврат: ${reason}`,
            status: 'REFUNDED',
            isRefund: true,
            refundReason: reason,
            refundedAt: new Date(),
            refundedById: userId,
            additives: item.additives.length > 0
              ? { connect: item.additives.map(a => ({ id: a.id })) }
              : undefined,
          },
        });
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: refundAmount },
          isRefund: true,
        },
        include: this.getOrderInclude(),
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: refundAmount } },
        });
      }

      // Логируем возврат
      await prisma.orderLog.create({
        data: {
          orderId,
          userId,
          action: 'PARTIAL_REFUND',
          message: `Частичный возврат ${refundQuantity} из ${item.quantity}`,
          metadata: {
            itemId,
            refundQuantity,
            totalQuantity: item.quantity,
            refundAmount,
            reason
          }
        }
      });

      return updated;
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление о возврате
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async refundOrderItem(
    orderId: string,
    itemId: string,
    reason: string,
    userId?: string
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
          refundedById: userId, // Добавляем информацию о пользователе
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

    // Отправляем WebSocket уведомление о возврате
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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
  private async releaseTable(tableId: string, orderId: string) {
    // Проверяем, есть ли другие активные заказы на этом столе
    const otherActiveOrders = await this.prisma.order.findMany({
      where: {
        tableId,
        status: {
          in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'],
        },
        id: { not: orderId },
      },
    });

    // Если других активных заказов нет, освобождаем стол
    if (otherActiveOrders.length === 0) {
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'AVAILABLE' },
      });
    }
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
      phone: dto.phone,
      customerName: dto.customerName,
      scheduledAt: dto.scheduledAt ? `${dto.scheduledAt}:00.000Z` : undefined,
    };

    if (dto.tableId !== undefined) {
    if (dto.tableId === null) {
      // Отвязываем стол
      if (order.tableId) {
        await this.releaseTable(order.tableId, order.id);
      }
      updateData.table = { disconnect: true };
      updateData.tableNumber = null;
    } else {
      // Привязываем новый стол
      await this.validateAndAssignTable(dto.tableId, order.restaurantId, order.id, dto.type);
      
      // Освобождаем старый стол, если он был
      if (order.tableId && order.tableId !== dto.tableId) {
        await this.releaseTable(order.tableId, order.id);
      }
      
      updateData.table = { connect: { id: dto.tableId } };
      updateData.type = 'DINE_IN'; // Автоматически меняем тип на "в зале"
    }
  }

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
        },
         table: {
      include: {
        hall: {
          include: {
            restaurant: true,
          },
        },
        },
      },
      },
    });

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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

    // Отправляем WebSocket уведомление об изменении флагов внимания
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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

    const response = this.mapToResponse(order);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async applyCustomerPoints(
    orderId: string,
    points: number,
    networkId?: string // Добавить параметр сети
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
        restaurant: {
          include: {
            network: true
          }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    if (!order.restaurant.network) {
      throw new BadRequestException('Ресторан не принадлежит сети');
    }

    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить оплаченный заказ');
    }

    // Используем networkId из параметра или из ресторана
    const targetNetworkId = networkId || order.restaurant.network.id;

    // Получаем текущий баланс клиента в сети
    const bonusBalance = await this.loyaltyService.getBonusBalance(
      order.customer.id,
      targetNetworkId
    );

    if (points > bonusBalance.balance) {
      throw new BadRequestException(
        'Недостаточно бонусных баллов у клиента в данной сети'
      );
    }

    // Конвертируем баллы в рубли (1 балл = 1 рубль)
    const pointsValue = points;

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      // Списываем баллы через сервис лояльности
      await this.loyaltyService.spendBonusPoints(
        order.customer.id,
        targetNetworkId,
        points,
        orderId,
        `Списание ${points} баллов для заказа #${order.number}`
      );

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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async removeCustomerPoints(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
        restaurant: {
          include: {
            network: true
          }
        }
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    if (!order.restaurant.network) {
      throw new BadRequestException('Ресторан не принадлежит сети');
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
      // Возвращаем баллы через сервис лояльности
      await this.loyaltyService.earnBonusPoints(
        order.customer.id,
        order.restaurant.network.id,
        pointsToReturn,
        orderId,
        `Возврат ${pointsToReturn} баллов для заказа #${order.number}`
      );

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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async applyCustomerPersonalDiscount(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
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

    if (!order?.customer) {
      throw new BadRequestException('К заказу не привязан клиент');
    }

    // Получаем персональную скидку клиента для этого ресторана
    const personalDiscount = await this.loyaltyService.getPersonalDiscount(
      order.customer.id,
      order.restaurantId
    );

    if (personalDiscount.discount <= 0 || !personalDiscount.isActive) {
      throw new BadRequestException('У клиента нет активной персональной скидки для этого ресторана');
    }

    const discountValue = personalDiscount.discount;
    const discountAmount = Math.floor(order.totalAmount * discountValue / 100);

    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: discountAmount },
          discountAmount: { increment: discountAmount },
          hasDiscount: true,
          personalDiscountId: personalDiscount.id,
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async assignOrderToShift(
    orderId: string,
    shiftId: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    // Проверяем существование смены
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId }
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    // Проверяем, что смена принадлежит тому же ресторану
    if (shift.restaurantId !== order.restaurantId) {
      throw new BadRequestException('Смена не принадлежит ресторану заказа');
    }

    // Проверяем, что заказ еще не оплачен (если нужно)
    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя изменить смену для оплаченного заказа');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shift: { connect: { id: shiftId } }
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об изменении заказа
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

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

  async assignCourierToDelivery(
    orderId: string,
    courierId: string
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    // Проверяем, что заказ типа доставка
    if (order.type !== 'DELIVERY') {
      throw new BadRequestException('Курьер может быть назначен только для заказов доставки');
    }

    // Проверяем существование курьера и его роль
    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,

      }
    });

    if (!courier) {
      throw new NotFoundException('Курьер не найден');
    }

    const updateData: any = {
      deliveryCourier: { connect: { id: courierId } }
    };

    // Если доставка еще не начата, устанавливаем время начала
    if (!order.deliveryStartedAt && order.status === 'READY') {
      updateData.deliveryStartedAt = new Date();
      updateData.status = 'DELIVERING';
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        ...this.getOrderInclude(),
        deliveryCourier: {
          select: {
            id: true,
            name: true,
          }
        },
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

    // Отправляем WebSocket уведомление о назначении курьера
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async startDelivery(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    if (order.type !== 'DELIVERY') {
      throw new BadRequestException('Только заказы доставки могут быть начаты');
    }

    if (order.status !== 'READY') {
      throw new BadRequestException('Доставка может быть начата только для заказов со статусом READY');
    }

    if (order.deliveryStartedAt) {
      throw new BadRequestException('Доставка уже начата');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryStartedAt: new Date(),
        status: 'DELIVERING',
      },
      include: {
        ...this.getOrderInclude(),
        deliveryCourier: {
          select: {
            id: true,
            name: true,
          }
        },
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

    // Отправляем WebSocket уведомление о начале доставки
    setTimeout(async () => {
      await this.orderGateway.notifyOrderStatusUpdated(response);
    }, 100);

    return response;
  }

  async completeDelivery(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    if (order.type !== 'DELIVERY') {
      throw new BadRequestException('Только заказы доставки могут быть завершены');
    }

    if (order.status !== 'DELIVERING') {
      throw new BadRequestException('Доставка может быть завершена только для заказов со статусом DELIVERING');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
      },
      include: {
        ...this.getOrderInclude(),
        deliveryCourier: {
          select: {
            id: true,
            name: true,
          }
        },
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

    // Отправляем WebSocket уведомление о завершении доставки
    setTimeout(async () => {
      await this.orderGateway.notifyOrderStatusUpdated(response);
    }, 100);

    return response;
  }

  async removeCourierFromDelivery(orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    if (!order.deliveryCourierId) {
      return this.mapToResponse(order);
    }

    if (order.status === 'DELIVERING') {
      throw new BadRequestException('Нельзя удалить курьера из активной доставки');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryCourier: { disconnect: true },
        deliveryStartedAt: null, // Сбрасываем время начала доставки
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

    const response = this.mapToResponse(updatedOrder);

    // Отправляем WebSocket уведомление об удалении курьера
    setTimeout(async () => {
      await this.orderGateway.notifyOrderModified(response);
    }, 100);

    return response;
  }

  async getDeliveryOrders(restaurantId?: string): Promise<OrderResponse[]> {
    const where: any = {
      type: 'DELIVERY',
      status: {
        in: ['READY', 'DELIVERING']
      }
    };

    if (restaurantId) {
      where.restaurantId = restaurantId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        ...this.getOrderInclude(),
        deliveryCourier: {
          select: {
            id: true,
            name: true,
          }
        },
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

  async getCourierActiveDeliveries(courierId: string): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        deliveryCourierId: courierId,
        type: 'DELIVERY',
        status: 'DELIVERING'
      },
      orderBy: { deliveryStartedAt: 'asc' },
      include: {
        ...this.getOrderInclude(),
        deliveryCourier: {
          select: {
            id: true,
            name: true,
          }
        },
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

  private async getOrderData(dto: CreateOrderDto) {
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
    return { restaurant, products, additives, productPrices };
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
      throw new NotFoundException(`Модификаторы не найдены: ${missingAdditives.join(', ')}`);
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

  private async calculateOrderTotal(
    items: CreateOrderDto['items'],
    additives: { id: string; price: number }[],
    productPrices: { productId: string; price: number }[],
    orderAdditivesInfo?: any[], // Изменяем тип
    orderType?: string,
    numberOfPeople?: string
  ): Promise<number> {
    const itemsTotal = items.reduce((sum, item) => {
      const productPrice = productPrices.find(pp => pp.productId === item.productId)?.price || 0;
      const itemAdditives = additives.filter(a => item.additiveIds?.includes(a.id));
      const additivesPrice = itemAdditives.reduce((aSum, a) => aSum + a.price, 0);

      return sum + (productPrice + additivesPrice) * item.quantity;
    }, 0);

    let orderAdditivesTotal = 0;

    if (orderAdditivesInfo?.length) {
      for (const additiveInfo of orderAdditivesInfo) {
        const { additive, quantity } = additiveInfo;

        if (!additive) continue; // Пропускаем если additive не найден

        let additiveTotalPrice = 0;

        switch (additive.type) {
          case OrderAdditiveType.FIXED:
            additiveTotalPrice = additive.price * quantity;
            break;

          case OrderAdditiveType.PER_ITEM:
            const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
            additiveTotalPrice = additive.price * totalItemsCount * quantity;
            break;

          case OrderAdditiveType.PER_PERSON:
            const personCount = parseInt(numberOfPeople || '1');
            additiveTotalPrice = additive.price * personCount * quantity;
            break;
        }

        orderAdditivesTotal += additiveTotalPrice;
      }
    }

    return itemsTotal + orderAdditivesTotal;
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
          startedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          pausedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          refundedBy: {
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
      deliveryCourier: {
        select: {
          id: true,
          name: true,
        }
      },
      surcharges: {
        include: {
          surcharge: true
        }
      },
      orderOrderAdditives: { 
        include: {
          orderAdditive: {
            include: {
              network: true,
              inventoryItem: true
            }
          }
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
      },
      startedBy: item.startedBy ? {
        id: item.startedBy.id,
        name: item.startedBy.name,
      } : null,
      completedBy: item.completedBy ? {
        id: item.completedBy.id,
        name: item.completedBy.name,
      } : null,
      pausedBy: item.pausedBy ? {
        id: item.pausedBy.id,
        name: item.pausedBy.name,
      } : null,
      refundedBy: item.refundedBy ? {
        id: item.refundedBy.id,
        name: item.refundedBy.name,
      } : null,
    })) || [];

    const orderAdditivesWithTotals = order.orderOrderAdditives?.map((oa: any) => {
      const basePrice = oa.price * oa.quantity;
      let totalPrice = basePrice;

      if (oa.orderAdditive.type === OrderAdditiveType.PER_ITEM) {
        const itemCount = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
        totalPrice = basePrice * itemCount;
      } else if (oa.orderAdditive.type === OrderAdditiveType.PER_PERSON) {
        const personCount = parseInt(order.numberOfPeople || '1');
        totalPrice = basePrice * personCount;
      }

      return {
        ...oa,
        totalPrice,
        orderAdditive: {
          ...oa.orderAdditive,
          network: oa.orderAdditive.network,
          inventoryItem: oa.orderAdditive.inventoryItem
        }
      };
    }) || [];

    const itemsTotal = itemsWithTotals.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const orderAdditivesTotal = orderAdditivesWithTotals.reduce((sum: number, oa: any) => sum + oa.totalPrice, 0);
    const surchargesTotal = order.surcharges?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0;

    const totalPrice = itemsTotal + orderAdditivesTotal + surchargesTotal;
    const totalItems = itemsWithTotals.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      source: order.source,
      type: order.type,
      deliveryAddress: order.deliveryAddress,
      deliveryTime: order.deliveryTime,
      deliveryNotes: order.deliveryNotes,
      deliveryEntrance: order.deliveryEntrance,
      deliveryIntercom: order.deliveryIntercom,
      deliveryFloor: order.deliveryFloor,
      deliveryApartment: order.deliveryApartment,
      deliveryCourierComment: order.deliveryCourierComment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      phone: order.phone,
      scheduledAt: order.scheduledAt,
      customerName: order.customerName,
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
      } : undefined,
      restaurant: {
        id: order.restaurant?.id,
        name: order.restaurant?.name,
        address: order.restaurant?.address,
      },
      personalDiscount: order.personalDiscount ? {
        id: order.personalDiscount.id,
        discount: order.personalDiscount.discount,
        isActive: order.personalDiscount.isActive,
      } : undefined,
      items: itemsWithTotals.map(item => ({
        id: item.id,
        status: item.status,
        isReordered: item.isReordered,
        timestamps: item.timestamps,
        startedBy: item.startedBy,
        completedBy: item.completedBy,
        refundedBy: item.refundedBy,
        pausedBy: item.pausedBy,
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
          composition: item.product.composition,
          printLabels: item.product.printLabels
        },
        quantity: item.quantity,
        comment: item.comment,
        additives: item.additives?.map(additive => ({
          id: additive.id,
          title: additive.title,
          price: additive.price,
        })) || [],
      })),
      orderAdditives: orderAdditivesWithTotals.map(oa => ({
        id: oa.id,
        orderAdditiveId: oa.orderAdditiveId,
        quantity: oa.quantity,
        price: oa.price,
        totalPrice: oa.totalPrice,
        createdAt: oa.createdAt,
        orderAdditive: {
          id: oa.orderAdditive.id,
          title: oa.orderAdditive.title,
          description: oa.orderAdditive.description,
          type: oa.orderAdditive.type,
          network: oa.orderAdditive.network,
          inventoryItem: oa.orderAdditive.inventoryItem
        }
      })),
      payment: order.payment ? {
        id: order.payment.id,
        method: order.payment.method,
        amount: order.payment.amount,
        status: order.payment.status,
        externalId: order.payment.externalId,
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
      table: order.table ? {
      id: order.table.id,
      name: order.table.name,
      seats: order.table.seats,
      status: order.table.status,
      hall: order.table.hall ? {
        id: order.table.hall.id,
        title: order.table.hall.title,
      } : null,
      tags: order.table.tags?.map((tt: any) => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color,
      })) || [],
    } : null,
    };
  }
}