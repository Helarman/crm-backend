import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateReservationDto, ReservationSource } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { CustomerService } from '../customer/customer.service';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  async createReservation(dto: CreateReservationDto) {
    // Проверяем существование стола и его статус
    const table = await this.prisma.table.findUnique({
      where: { id: dto.tableId },
      include: {
        hall: {
          include: {
            restaurant: {
              include: {
                network: true,
              },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Стол не найден');
    }

    if (table.status !== 'AVAILABLE') {
      throw new BadRequestException('Стол недоступен для бронирования');
    }

    // Проверяем наличие пересекающихся бронирований
    const existingReservations = await this.prisma.reservation.findMany({
      where: {
        tableId: dto.tableId,
        status: {
          in: ['CONFIRMED', 'PENDING', 'ARRIVED'],
        },
        reservationTime: {
          gte: new Date(new Date(dto.reservationTime).getTime() - 2 * 60 * 60 * 1000), // 2 часа до
          lte: new Date(new Date(dto.reservationTime).getTime() + 2 * 60 * 60 * 1000), // 2 часа после
        },
      },
    });

    if (existingReservations.length > 0) {
      throw new ConflictException('На это время уже есть бронирование');
    }

    // Нормализуем телефон
    const normalizedPhone = dto.phone.replace(/\D/g, '');
    
    // Ищем или создаем клиента
    let customerId: string | undefined;
    try {
      const customer = await this.customerService.getCustomerByPhone(
        normalizedPhone,
        table.hall.restaurant.networkId
      );
      customerId = customer.id;
    } catch {
      // Если клиент не найден, создаем бронь без привязки к customer
    }

    // Создаем бронирование
    const reservation = await this.prisma.reservation.create({
      data: {
        tableId: dto.tableId,
        customerId,
        phone: normalizedPhone,
        customerName: dto.customerName,
        email: dto.email,
        reservationTime: new Date(dto.reservationTime),
        numberOfPeople: dto.numberOfPeople,
        comment: dto.comment,
        source: dto.source || ReservationSource.PANEL,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        table: {
          include: {
            hall: {
              include: {
                restaurant: true,
              },
            },
          },
        },
        customer: true,
      },
    });

    // Обновляем статус стола на "Забронирован"
    await this.prisma.table.update({
      where: { id: dto.tableId },
      data: { status: 'RESERVED' },
    });

    // Отправляем SMS клиенту (заглушка)
    await this.sendReservationSMS(reservation, table);

    return reservation;
  }

  private async sendReservationSMS(reservation: any, table: any) {
    const restaurant = table.hall.restaurant;
    const formattedTime = new Date(reservation.reservationTime).toLocaleString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = `Забронирован стол в ${restaurant.title} (${restaurant.network.name}) на ${formattedTime}. 
    Стол: ${table.name}. Количество персон: ${reservation.numberOfPeople}.`;

    console.log(`SMS to ${reservation.phone}: ${message}`);
    // В реальном приложении здесь будет интеграция с SMS-сервисом
    return true;
  }

  async getReservations(query: ReservationQueryDto) {
    const {
      restaurantId,
      hallId,
      tableId,
      status,
      startDate,
      endDate,
      phone,
      onlyActive,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = {};

    if (tableId) {
      where.tableId = tableId;
    } else if (hallId) {
      where.table = { hallId };
    } else if (restaurantId) {
      where.table = { hall: { restaurantId } };
    }

    if (status) {
      where.status = status;
    }

    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      where.phone = { contains: normalizedPhone };
    }

    if (startDate) {
      where.reservationTime = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.reservationTime = where.reservationTime || {};
      where.reservationTime.lte = new Date(endDate);
    }

    if (onlyActive) {
      where.status = { in: ['CONFIRMED', 'PENDING', 'ARRIVED'] };
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include: {
          table: {
            include: {
              hall: {
                include: {
                  restaurant: {
                    include: {
                      network: true,
                    },
                  },
                },
              },
            },
          },
          customer: true,
        },
        orderBy: [
          { reservationTime: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getReservationById(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        table: {
          include: {
            hall: {
              include: {
                restaurant: {
                  include: {
                    network: true,
                  },
                },
              },
            },
          },
        },
        customer: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    return reservation;
  }

  async updateReservation(id: string, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    // Если меняем статус на CANCELLED, освобождаем стол
    if (dto.status === ReservationStatus.CANCELLED && reservation.status !== ReservationStatus.CANCELLED) {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'AVAILABLE' },
      });
      
      dto.cancellationTime = new Date();
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        reservationTime: dto.reservationTime ? new Date(dto.reservationTime) : undefined,
        numberOfPeople: dto.numberOfPeople,
        comment: dto.comment,
        status: dto.status,
        arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : undefined,
        cancellationTime: dto.cancellationTime ? new Date(dto.cancellationTime) : undefined,
      },
      include: {
        table: {
          include: {
            hall: {
              include: {
                restaurant: true,
              },
            },
          },
        },
        customer: true,
      },
    });

    return updatedReservation;
  }

  async cancelReservation(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Бронирование уже отменено');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancellationTime: new Date(),
      },
    });

    // Освобождаем стол
    await this.prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'AVAILABLE' },
    });

    return updatedReservation;
  }

  async markAsArrived(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Нельзя отметить прибытие для отмененной брони');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.ARRIVED,
        arrivalTime: new Date(),
      },
    });

    // Меняем статус стола на "Занят"
    await this.prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'OCCUPIED' },
    });

    return updatedReservation;
  }

  async completeReservation(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Нельзя завершить отмененную бронь');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.COMPLETED,
      },
    });

    // Меняем статус стола на "На уборке"
    await this.prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'CLEANING' },
    });

    // Через 30 минут стол станет свободным (можно реализовать через задачи)
    setTimeout(async () => {
      try {
        await this.prisma.table.update({
          where: { id: reservation.tableId },
          data: { status: 'AVAILABLE' },
        });
      } catch (error) {
        console.error('Ошибка при автоматическом освобождении стола:', error);
      }
    }, 30 * 60 * 1000); // 30 минут

    return updatedReservation;
  }

  async markAsNoShow(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Нельзя отметить как неявку для отмененной брони');
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.NO_SHOW,
      },
    });

    // Освобождаем стол
    await this.prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'AVAILABLE' },
    });

    return updatedReservation;
  }

  async deleteReservation(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (reservation.status === 'ARRIVED') {
      throw new BadRequestException('Нельзя удалить бронь, по которой клиент уже прибыл');
    }

    // Если бронь активна, освобождаем стол
    if (reservation.status === 'CONFIRMED') {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.reservation.delete({
      where: { id },
    });
  }

  async getReservationStatistics(restaurantId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      table: { hall: { restaurantId } },
    };

    if (startDate) {
      where.reservationTime = { gte: startDate };
    }

    if (endDate) {
      where.reservationTime = where.reservationTime || {};
      where.reservationTime.lte = endDate;
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      include: {
        table: {
          include: {
            hall: true,
          },
        },
      },
    });

    const total = reservations.length;
    const confirmed = reservations.filter(r => r.status === 'CONFIRMED').length;
    const arrived = reservations.filter(r => r.status === 'ARRIVED').length;
    const cancelled = reservations.filter(r => r.status === 'CANCELLED').length;
    const noShow = reservations.filter(r => r.status === 'NO_SHOW').length;

    // Группировка по времени суток
    const timeGroups = {
      morning: 0, // 9:00 - 12:00
      afternoon: 0, // 12:00 - 17:00
      evening: 0, // 17:00 - 23:00
      night: 0, // 23:00 - 9:00
    };

    reservations.forEach(reservation => {
      const hour = new Date(reservation.reservationTime).getHours();
      if (hour >= 9 && hour < 12) timeGroups.morning++;
      else if (hour >= 12 && hour < 17) timeGroups.afternoon++;
      else if (hour >= 17 && hour < 23) timeGroups.evening++;
      else timeGroups.night++;
    });

    return {
      restaurantId,
      period: {
        startDate,
        endDate,
      },
      statistics: {
        total,
        confirmed,
        arrived,
        cancelled,
        noShow,
        arrivalRate: total > 0 ? (arrived / total) * 100 : 0,
        cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
        noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      },
      timeDistribution: timeGroups,
      averagePeoplePerReservation: total > 0 
        ? reservations.reduce((sum, r) => sum + r.numberOfPeople, 0) / total 
        : 0,
    };
  }

  async getUpcomingReservations(restaurantId: string, hours: number = 24) {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.prisma.reservation.findMany({
      where: {
        table: { hall: { restaurantId } },
        reservationTime: {
          gte: now,
          lte: endTime,
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      include: {
        table: {
          include: {
            hall: true,
          },
        },
        customer: true,
      },
      orderBy: { reservationTime: 'asc' },
    });
  }
  
async getReservationsByTable(tableId: string, query?: ReservationQueryDto) {
  const {
    status,
    startDate,
    endDate,
    onlyActive = false,
    page = 1,
    limit = 20,
  } = query || {};

  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100);

  const where: any = { tableId };

  if (status) {
    where.status = status;
  }

  if (startDate) {
    where.reservationTime = { gte: new Date(startDate) };
  }

  if (endDate) {
    where.reservationTime = where.reservationTime || {};
    where.reservationTime.lte = new Date(endDate);
  }

  if (onlyActive) {
    where.status = { in: ['CONFIRMED', 'PENDING', 'ARRIVED'] };
  }

  const [reservations, total] = await Promise.all([
    this.prisma.reservation.findMany({
      where,
      include: {
        table: {
          include: {
            hall: {
              include: {
                restaurant: true,
              },
            },
          },
        },
        customer: true,
      },
      orderBy: [
        { reservationTime: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take,
    }),
    this.prisma.reservation.count({ where }),
  ]);

  return {
    data: reservations,
    pagination: {
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
}

async getCurrentReservationByTable(tableId: string) {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const reservation = await this.prisma.reservation.findFirst({
    where: {
      tableId,
      status: {
        in: ['CONFIRMED', 'PENDING', 'ARRIVED'],
      },
      reservationTime: {
        gte: twoHoursAgo,
        lte: twoHoursLater,
      },
    },
    include: {
      table: {
        include: {
          hall: {
            include: {
              restaurant: true,
            },
          },
        },
      },
      customer: true,
    },
    orderBy: {
      reservationTime: 'asc',
    },
  });

  return reservation;
}

async getUpcomingReservationsByTable(tableId: string, hours: number = 24) {
  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return this.prisma.reservation.findMany({
    where: {
      tableId,
      reservationTime: {
        gte: now,
        lte: endTime,
      },
      status: {
        in: ['CONFIRMED', 'PENDING'],
      },
    },
    include: {
      table: {
        include: {
          hall: true,
        },
      },
      customer: true,
    },
    orderBy: { reservationTime: 'asc' },
  });
}

async getTableReservationHistory(tableId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const reservations = await this.prisma.reservation.findMany({
    where: {
      tableId,
      reservationTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      table: {
        include: {
          hall: true,
        },
      },
      customer: true,
    },
    orderBy: { reservationTime: 'desc' },
  });

  // Группируем по статусам для статистики
  const statistics = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    arrived: reservations.filter(r => r.status === 'ARRIVED').length,
    cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
    noShow: reservations.filter(r => r.status === 'NO_SHOW').length,
    completed: reservations.filter(r => r.status === 'COMPLETED').length,
  };

  return {
    tableId,
    period: {
      startDate,
      endDate,
      days,
    },
    statistics,
    reservations,
  };
}
}