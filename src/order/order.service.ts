import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponse } from './dto/order-response.dto';
import { EnumOrderItemStatus, EnumOrderStatus, EnumPaymentStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { BulkUpdateOrderItemsStatusDto } from './dto/bulk-update-order-items-status.dto';
import { AddItemToOrderDto } from './dto/add-item-to-order.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

function timeStringToISODate(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const date = new Date();

  date.setHours(hours, minutes, 0, 0); 
  
  const fullISO = new Date(date.toISOString().slice(0, 16) + ":00Z").toISOString();
  return fullISO
}


@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  
  async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
    // Валидация данных
    const { restaurant, products, additives, productPrices } = await this.validateOrderData(dto);

    // Проверка стоп-листа
    const stopListProducts = this.checkStopList(products, productPrices);
    if (stopListProducts.length > 0) {
      throw new BadRequestException(
        `Следующие продукты в стоп-листе: ${stopListProducts.join(', ')}`
      );
    }

    // Генерация уникального номера заказа
    const orderNumber = await this.generateOrderNumber(dto.restaurantId);

    let deliveryPrice = 0
    if(dto.type === "DELIVERY" ){
      deliveryPrice = dto.deliveryZone.price
    }
    // Расчет суммы
    const totalAmount = this.calculateOrderTotal(dto.items, additives, productPrices) + deliveryPrice;
    // Создание заказа в транзакции
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
          deliveryTime: dto.deliveryTime ? timeStringToISODate(dto.deliveryTime) : undefined,
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


  async addItemToOrder(orderId: string, dto: AddItemToOrderDto): Promise<OrderResponse> {
    // 1. Находим заказ и проверяем его существование
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, payment: true },
    });

    if (!order || !order.restaurant) {
      throw new NotFoundException('Заказ или ресторан не найден');
    }

    // 2. Проверяем статус оплаты
    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя добавить позицию в оплаченный заказ');
    }

    // 3. Находим продукт с проверкой на null
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Продукт с ID ${dto.productId} не найден`);
    }

    // 4. Проверяем связь продукта с рестораном
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

    // 5. Получаем или создаем цену продукта
    let productPrice = await this.prisma.restaurantProductPrice.findFirst({
      where: {
        productId: dto.productId,
        restaurantId: order.restaurant.id,
      },
    });

    // Если цена не найдена, создаем новую запись с базовой ценой
    if (!productPrice) {
      productPrice = await this.prisma.restaurantProductPrice.create({
        data: {
          productId: dto.productId,
          restaurantId: order.restaurant.id,
          price: product.price, // Используем базовую цену
          isStopList: false
        }
      });
    }

    // 6. Проверяем стоп-лист
    if (productPrice.isStopList) {
      throw new BadRequestException(
        `Продукт "${product.title}" в стоп-листе ресторана "${order.restaurant.title}"`
      );
    }

    // 7. Проверяем добавки
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

    // 8. Рассчитываем стоимость
    const additivesPrice = additives.reduce((sum, a) => sum + a.price, 0);
    const itemPrice = (productPrice.price + additivesPrice) * dto.quantity;

    // 9. Добавляем позицию в транзакции
    const updatedOrder = await this.prisma.$transaction(async (prisma) => {
      await prisma.orderItem.create({
        data: {
          order: { connect: { id: orderId } },
          product: { connect: { id: dto.productId } },
          quantity: dto.quantity,
          price: productPrice.price,
          comment: dto.comment,
          status: 'CREATED',
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
        include: this.getOrderInclude(),
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: itemPrice } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
  }

  async generateOrderNumber(restaurantId: string): Promise<string> {
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

  async findById(id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.getOrderInclude(),
    });
    if (!order) throw new NotFoundException('Заказ не найден');
    return this.mapToResponse(order);
  }

  async findByRestaurantId(restaurantId: string): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { restaurantId },
      include: this.getOrderInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(order => this.mapToResponse(order));
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
      include: this.getOrderInclude(),
    });

    return this.mapToResponse(updatedOrder);
  }

  async updateOrderItem(
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto
  ): Promise<OrderResponse> {
    // 1. Находим заказ и проверяем его существование
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          where: { id: itemId },
          include: { additives: true }
        },
        payment: true 
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    const item = order.items[0];
    if (!item) {
      throw new NotFoundException('Позиция заказа не найдена');
    }

    // 2. Проверяем статус позиции - можно редактировать только возвращенные
    if (item.status !== 'REFUNDED') {
      throw new BadRequestException(
        'Можно редактировать только возвращенные позиции'
      );
    }

    // 3. Проверяем статус оплаты
    if (order.payment?.status === 'PAID') {
      throw new BadRequestException('Нельзя редактировать позиции в оплаченном заказе');
    }

    // 4. Проверяем добавки, если они указаны
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

    // 5. Получаем текущую цену продукта
    const productPrice = await this.prisma.restaurantProductPrice.findFirst({
      where: {
        productId: item.productId,
        restaurantId: order.restaurantId,
      },
    });

    if (!productPrice) {
      throw new NotFoundException('Цена продукта не найдена');
    }

    // 6. Рассчитываем разницу в стоимости
    const oldAdditivesPrice = item.additives.reduce((sum, a) => sum + a.price, 0);
    const newAdditivesPrice = additives.reduce((sum, a) => sum + a.price, 0);
    
    const oldItemPrice = (productPrice.price + oldAdditivesPrice) * item.quantity;
    const newItemPrice = (productPrice.price + newAdditivesPrice) * item.quantity;
    const priceDifference = newItemPrice - oldItemPrice;

    // 7. Обновляем позицию в транзакции
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
        include: this.getOrderInclude(),
      });

      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: priceDifference } },
        });
      }

      return updated;
    });

    return this.mapToResponse(updatedOrder);
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

    const updateData: any = { status: dto.status };
    if (dto.status === EnumOrderItemStatus.IN_PROGRESS && dto.userId) {
      updateData.assignedToId = dto.userId;
      updateData.startedAt = new Date();
    }
    if (dto.status === EnumOrderItemStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const updatedOrder = await this.checkAndUpdateOrderStatus(item.order);
    return this.mapToResponse(updatedOrder);
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
    return this.mapToResponse(updatedOrder);
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
        include: this.getOrderInclude(),
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
      appliedDiscounts: true,
      appliedMarkup: true,
    };
  }

  private mapToResponse(order: any): OrderResponse {
    const itemsWithTotals = order.items?.map((item: any) => ({
      ...item,
      totalPrice: (item.price + (item.additives?.reduce((sum: number, a: any) => sum + a.price, 0) || 0)) * item.quantity,
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
      totalAmount: order.totalAmount ,
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
      items: itemsWithTotals.map(item => ({
        id: item.id,
        status: item.status,
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
    };
  }
}