import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { EnumOrderItemStatus, EnumOrderStatus, EnumPaymentStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { OrderItemStatus } from './types';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
    // Валидация данных
    const { restaurant, products, additives } = await this.validateOrderData(dto);

    // Генерация уникального номера заказа
    const orderNumber = await this.generateOrderNumber(dto.restaurantId);

    // Расчет суммы
    const totalAmount = this.calculateOrderTotal(dto.items, products, additives);

    // Создание заказа в транзакции
    const order = await this.prisma.$transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          status: 'CREATED',
          number: orderNumber,
          customer: dto.customerId ? { connect: { id: dto.customerId } } : undefined,
          restaurant: { connect: { id: dto.restaurantId } },
          shift: dto.shiftId ? { connect: { id: dto.shiftId } } : undefined,
          type: dto.type,
          scheduledAt: dto.scheduledAt,
          totalAmount,
          comment: dto.comment,
          deliveryAddress: dto.deliveryAddress,
          deliveryTime: dto.deliveryTime,
          deliveryNotes: dto.deliveryNotes,
          items: {
            create: dto.items.map(item => ({
              product: { connect: { id: item.productId } },
              quantity: item.quantity,
              price: products.find(p => p.id === item.productId)?.price || 0,
              comment: item.comment,
              status: 'CREATED',
              additives: item.additiveIds
                ? { connect: item.additiveIds.map(id => ({ id })) }
                : undefined,
            })),
          },
        },
        include: {
          items: {
            include: {
              additives: true,
              product: true,
            },
          },
          customer: true,
          restaurant: true,
          shift: true,
        },
      });

      // Создание платежа если указан
      if (dto.payment) {
        await prisma.payment.create({
          data: {
            order: { connect: { id: order.id } },
            amount: order.totalAmount,
            method: dto.payment.method,
            status: 'PAID',
            externalId: dto.payment.externalId,
          },
        });
      }

      return order;
    });
    return this.mapToResponse(order);
  }

  async generateOrderNumber(restaurantId: string): Promise<string> {

    // Текущая дата в формате DDMMYY
    const dateStr = new Date()
      .toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
      .replace(/\./g, '');

    // Случайная часть (4 цифры)
    const randomPart = Math.floor(1000 + Math.random() * 9000);

    // Собираем номер
    const number = `${dateStr}-${randomPart}`;

    // Проверяем уникальность (очень маловероятно, но на всякий случай)
    const exists = await this.prisma.order.findUnique({
      where: { number },
    });

    if (exists) {
      // Если номер уже существует (крайне маловероятно), генерируем новый
      return this.generateOrderNumber(restaurantId);
    }

    return number;
  }

  async validateOrderData(dto: CreateOrderDto) {
    const [restaurant, products, additives] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: dto.restaurantId },
      }),
      this.prisma.product.findMany({
        where: { id: { in: dto.items.map(item => item.productId) } },
      }),
      this.prisma.additive.findMany({
        where: { id: { in: dto.items.flatMap(item => item.additiveIds || []) } },
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

    // Проверка продуктов
    const missingProducts = dto.items
      .filter(item => !products.some(p => p.id === item.productId))
      .map(item => item.productId);

    if (missingProducts.length > 0) {
      throw new NotFoundException(`Продукты не найдены: ${missingProducts.join(', ')}`);
    }

    // Проверка добавок
    const allAdditiveIds = dto.items.flatMap(item => item.additiveIds || []);
    const missingAdditives = allAdditiveIds
      .filter(id => !additives.some(a => a.id === id));

    if (missingAdditives.length > 0) {
      throw new NotFoundException(`Добавки не найдены: ${missingAdditives.join(', ')}`);
    }

    return { restaurant, products, additives };
  }

  calculateOrderTotal(
    items: CreateOrderDto['items'],
    products: Array<{ id: string; price: number }>,
    additives: Array<{ id: string; price: number }>,
  ): number {
    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const itemAdditives = additives.filter(a =>
        item.additiveIds?.includes(a.id)
      );

      const productPrice = product?.price || 0;
      const additivesPrice = itemAdditives.reduce((aSum, a) => aSum + a.price, 0);

      return sum + (productPrice + additivesPrice) * item.quantity;
    }, 0);
  }
  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });
  
    if (!order) {
      throw new NotFoundException({
        statusCode: 404,
        message: `Order not found`,
        error: 'Not Found'
      });
    }
  
    console.log(`Attempting to change status from ${order.status} to ${dto.status}`);
  
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        items: { include: { product: true, additives: true } },
        customer: true,
        restaurant: true
      }
    });
  
    return this.mapToResponse(updatedOrder);
  }
  
  private getValidTransitions(currentStatus: EnumOrderStatus): string[] {
    const transitions = {
      [EnumOrderStatus.CREATED]: ['CONFIRMED', 'CANCELLED'],
      [EnumOrderStatus.CONFIRMED]: ['PREPARING', 'CANCELLED'],
      [EnumOrderStatus.PREPARING]: ['READY', 'CANCELLED'],
      [EnumOrderStatus.READY]: ['DELIVERING', 'COMPLETED'],
      [EnumOrderStatus.DELIVERING]: ['COMPLETED']
    };
  
    return transitions[currentStatus] || [];
  }

  async updatePaymentStatus(order: any, status: string) {
    if (order.payments?.length > 0) {
      await this.prisma.payment.update({
        where: { id: order.payments[0].id },
        data: {
          status: status as EnumPaymentStatus // Явное приведение типа
        },
      });
    }
  }
  private mapToResponse(order: any): OrderResponse {
    // Рассчитываем общие суммы и количество
    const itemsWithTotals = order.items?.map((item: any) => {
      const itemPrice = item.price || 0;
      const additivesPrice = item.additives?.reduce((sum: number, additive: any) =>
        sum + (additive.price || 0), 0) || 0;
      return {
        ...item,
        totalPrice: (itemPrice + additivesPrice) * (item.quantity || 1)
      };
    }) || [];

    const totalPrice = itemsWithTotals.reduce((sum: number, item: any) =>
      sum + item.totalPrice, 0);
    const totalItems = itemsWithTotals.reduce((sum: number, item: any) =>
      sum + (item.quantity || 1), 0);

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      type: order.type,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      scheduledAt: order.scheduledAt || undefined,
      comment: order.comment || undefined,
      totalPrice,
      totalAmount: order.totalAmount || totalPrice,
      totalItems,
      restaurantId: order.restaurantId || order.restaurant?.id || '',

      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name || '',
        phone: order.customer.phone || '',
        email: order.customer.email || undefined
      } : undefined,

      restaurant: {
        id: order.restaurant?.id || '',
        name: order.restaurant?.name || '',
        address: order.restaurant?.address || ''
      },

      items: itemsWithTotals.map(item => ({
        id: item.id,
        product: {
          id: item.product?.id || '',
          title: item.product?.title,
          price: item.product?.price || 0,
          image: item.product?.image || undefined
        },
        quantity: item.quantity || 1,
        comment: item.comment || undefined,
        status: item.status || 'CREATED',
        additives: item.additives?.map(additive => ({
          id: additive.id,
          title: additive.title || '',
          price: additive.price || 0
        })) || []
      })),

      payment: order.payment ? {
        method: order.payment.method,
        amount: order.payment.amount || 0,
        status: order.payment.status,
        externalId: order.payment.externalId || undefined
      } : undefined,

      delivery: order.deliveryAddress ? {
        address: order.deliveryAddress,
        time: order.deliveryTime || undefined,
        notes: order.deliveryNotes || undefined
      } : undefined
    };
  }

  isValidStatusTransition(currentStatus: EnumOrderStatus, newStatus: EnumOrderStatus): boolean {
    const validTransitions = {
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
      [EnumOrderStatus.DELIVERING]: [
        EnumOrderStatus.COMPLETED,
      ],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  async findById(id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            additives: true,
            product: {
              include: {
                category: true, // Включаем категорию продукта
                additives: true // Включаем доступные добавки для продукта
              }
            },
            assignedTo: { // Включаем данные о назначенном пользователе
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // Сортировка элементов заказа
          }
        },
        payment: true, // Включаем информацию об оплате
        appliedDiscounts: true, // Включаем примененные скидки
        appliedMarkup: true // Включаем примененные наценки
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToResponse(order);
  }


  async findByRestaurantId(
    restaurantId: string,
  ): Promise<any> {
    const orders = await this.prisma.order.findMany({
      where: { restaurantId },
      include: {
        // Основные связи Order
        customer: true,
        restaurant: true,
        shift: true,

        // OrderItems с полной вложенностью
        items: {
          include: {
            // Продукт в OrderItem
            product: {
              include: {
                category: true,       // Категория продукта
                additives: true,     // Добавки продукта
                discounts: true,     // Скидки продукта
              },
            },
            // Добавки, выбранные в OrderItem
            additives: true,
            // Кто назначен на приготовление
            assignedTo: true,
          },
        },

        // Платежи
        payment: true,

        // Интеграция с Яндекс.Едой (если есть)
        yandexEdaOrder: true,

        // Скидки и наценки
        appliedDiscounts: true,
        appliedMarkup: true,
      },
      orderBy: { createdAt: 'desc' },
    });


    return orders;
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }


    // Дополнительные проверки для определенных статусов
    if (dto.status === 'COMPLETED') {
      const notReadyItems = order.items.filter(i => i.status !== 'COMPLETED');
      if (notReadyItems.length > 0) {
        throw new BadRequestException(
          `Cannot complete order with ${notReadyItems.length} items not ready`
        );
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: {
        items: { include: { product: true, additives: true } },
        customer: true,
        restaurant: true
      }
    });

    return this.mapToResponse(updatedOrder);
  }

  async updateOrderItemStatus(
    orderId: string,
    itemId: string, 
    dto: UpdateOrderItemStatusDto
  ): Promise<OrderResponse> {
    const item = await this.prisma.orderItem.findFirst({
      where: { 
        id: itemId,
        orderId: orderId
      },
      include: { order: true }
    });
  
    if (!item) {
      throw new NotFoundException(`Order item ${itemId} not found in order ${orderId}`);
    }
  
    if (!this.isValidItemStatusTransition(item.status, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${item.status} to ${dto.status}`
      );
    }
  
    const updateData: any = { status: dto.status };
  
    // Назначение пользователя при начале приготовления
    if (dto.status === OrderItemStatus.IN_PROGRESS && dto.userId) {
      updateData.assignedToId = dto.userId;
      updateData.startedAt = new Date();
    }
  
    // Фиксация времени завершения
    if (dto.status === OrderItemStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
  
    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
      include: { 
        product: true,
        additives: true,
        assignedTo: true,
        order: { include: { items: true } }
      }
    });
  
    await this.checkAndUpdateOrderStatus(updatedItem.order);
  
    return this.mapToResponse(updatedItem.order);
  }
  
  private isValidItemStatusTransition(
    currentStatus: EnumOrderItemStatus,
    newStatus: OrderItemStatus
  ): boolean {
    const allowedTransitions = {
      [OrderItemStatus.CREATED]: [
        OrderItemStatus.IN_PROGRESS, 
        OrderItemStatus.CANCELLED
      ],
      [OrderItemStatus.IN_PROGRESS]: [
        OrderItemStatus.PARTIALLY_DONE,
        OrderItemStatus.PAUSED,
        OrderItemStatus.COMPLETED,
        OrderItemStatus.CANCELLED
      ],
      [OrderItemStatus.PARTIALLY_DONE]: [
        OrderItemStatus.IN_PROGRESS,
        OrderItemStatus.COMPLETED
      ],
      [OrderItemStatus.PAUSED]: [
        OrderItemStatus.IN_PROGRESS,
        OrderItemStatus.CANCELLED
      ],
      [OrderItemStatus.COMPLETED]: [],
      [OrderItemStatus.CANCELLED]: []
    };
  
    return allowedTransitions[currentStatus].includes(newStatus);
  }

  async bulkUpdateOrderItemsStatus(
    orderId: string,
    dto: BulkUpdateOrderItemsStatusDto
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Проверяем что все itemIds принадлежат этому заказу
    const invalidItems = dto.itemIds.filter(id =>
      !order.items.some(i => i.id === id)
    );

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `Items not found in order: ${invalidItems.join(', ')}`
      );
    }

    const updateData: any = { status: dto.status };

    if (dto.status === 'IN_PROGRESS' && dto.userId) {
      updateData.assignedToId = dto.userId;
      updateData.startedAt = new Date();
    }

    if (dto.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    await this.prisma.orderItem.updateMany({
      where: { id: { in: dto.itemIds } },
      data: updateData
    });

    // Обновляем статус заказа если нужно
    const updatedOrder = await this.checkAndUpdateOrderStatus(order);

    return this.mapToResponse(updatedOrder);
  }

  private async checkAndUpdateOrderStatus(order: any): Promise<any> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId: order.id }
    });

    let newStatus: EnumOrderStatus | null = null;

    if (items.every(i => i.status === 'COMPLETED')) {
      newStatus = EnumOrderStatus.COMPLETED;
    } else if (items.some(i => i.status === 'IN_PROGRESS')) {
      newStatus = EnumOrderStatus.PREPARING;
    }

    if (newStatus && newStatus !== order.status) {
      return this.prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
        include: { items: true }
      });
    }

    return order;
  }

  private statusUpdateLocks = new Map<string, Promise<any>>();

  async updateStatusWithLock(id: string, dto: UpdateOrderStatusDto): Promise<OrderResponse> {
    if (this.statusUpdateLocks.has(id)) {
      await this.statusUpdateLocks.get(id);
    }

    try {
      const promise = this.updateStatus(id, dto);
      this.statusUpdateLocks.set(id, promise);
      return await promise;
    } finally {
      this.statusUpdateLocks.delete(id);
    }
  }
}