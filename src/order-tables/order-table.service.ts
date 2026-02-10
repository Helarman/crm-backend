import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AssignTableDto } from './dto/assign-table.dto';

@Injectable()
export class OrderTableService {
  constructor(private prisma: PrismaService) {}

  private includeOrderDetails: Prisma.OrderInclude = {
    table: {
      include: {
        hall: {
          include: {
            restaurant: true,
          },
        }
      },
    },
    items: true,
    customer: true,
    restaurant: true,
  };

  async assignTableToOrder(orderId: string, dto: AssignTableDto) {
    // Проверяем существование заказа
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // Проверяем существование стола
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId },
      include: { hall: true },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    // Проверяем, что стол принадлежит тому же ресторану
    const tableRestaurantId = table.hall?.restaurantId;
    if (tableRestaurantId !== order.restaurantId) {
      throw new ConflictException('Стол принадлежит другому ресторану');
    }

    // Проверяем, свободен ли стол
    const activeOrders = await this.prisma.order.findMany({
      where: {
        tableId: dto.tableId,
        status: {
          in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'],
        },
        id: { not: orderId }, // Исключаем текущий заказ
      },
    });

    if (activeOrders.length > 0) {
      throw new ConflictException('Стол уже занят другим активным заказом');
    }

    // Проверяем бронирования на это время
    const now = new Date();
    const upcomingReservations = await this.prisma.reservation.findMany({
      where: {
        tableId: dto.tableId,
        status: 'CONFIRMED',
        reservationTime: {
          gte: now,
          lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Проверяем ближайшие 2 часа
        },
      },
    });

    if (upcomingReservations.length > 0) {
      throw new ConflictException(
        'На этот стол есть подтвержденная бронь в ближайшее время',
      );
    }

    // Обновляем заказ
    const updateData: Prisma.OrderUncheckedUpdateInput = {
      tableId: dto.tableId,
      type: 'DINE_IN', // Автоматически меняем тип на "в зале"
      ...(dto.numberOfPeople && { numberOfPeople: dto.numberOfPeople }),
    };

    // Обновляем статус стола
    await this.prisma.table.update({
      where: { id: dto.tableId },
      data: { status: 'OCCUPIED' },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: this.includeOrderDetails,
    });
  }

  async unassignTableFromOrder(orderId: string) {
    // Проверяем существование заказа
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    if (!order.tableId) {
      throw new ConflictException('Заказ не привязан к столу');
    }

    const updateData: Prisma.OrderUncheckedUpdateInput = {
      tableId: null,
    };

    // Обновляем статус стола
    if (order.tableId) {
      // Проверяем, есть ли другие активные заказы на этом столе
      const otherActiveOrders = await this.prisma.order.findMany({
        where: {
          tableId: order.tableId,
          status: {
            in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'],
          },
          id: { not: orderId }, // Исключаем текущий заказ
        },
      });

      // Если других активных заказов нет, освобождаем стол
      if (otherActiveOrders.length === 0) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: this.includeOrderDetails,
    });
  }

  async getOrderTable(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: {
          include: {
            hall: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    return order.table;
  }

  async getOrdersByTable(tableId: string, includeCompleted = false) {
    const statuses = includeCompleted
      ? ['CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
      : ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'];

    return this.prisma.order.findMany({
      where: {
        tableId,
        status: {
          in: statuses as any,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getTableStatus(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: {
        hall: true,
        Order: {
          where: {
            status: {
              in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'] as any,
            },
          },
          include: {
            customer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        Reservation: {
          where: {
            status: 'CONFIRMED',
            reservationTime: {
              gte: new Date(),
            },
          },
          orderBy: {
            reservationTime: 'asc',
          },
          take: 1,
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    // Получаем количество отдельно
    const [activeOrdersCount, upcomingReservationsCount] = await Promise.all([
      this.prisma.order.count({
        where: {
          tableId,
          status: {
            in: ['CREATED', 'CONFIRMED', 'PREPARING', 'READY'],
          },
        },
      }),
      this.prisma.reservation.count({
        where: {
          tableId,
          status: 'CONFIRMED',
          reservationTime: {
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      ...table,
      isOccupied: activeOrdersCount > 0,
      hasUpcomingReservation: upcomingReservationsCount > 0,
      nextReservation: table.Reservation[0] || null,
      activeOrders: table.Order,
    };
  }
}