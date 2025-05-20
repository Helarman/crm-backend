import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ManageShiftUserDto } from './dto/manage-shift-user.dto';
import { ManageShiftOrderDto } from './dto/manage-shift-order.dto';
import { GetShiftsDto } from './dto/get-shifts.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async createShift(dto: CreateShiftDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    return this.prisma.shift.create({
      data: {
        restaurantId: dto.restaurantId,
        status: dto.status,
        startTime: dto.startTime,
        endTime: dto.endTime,
        description: dto.description,
      },
      include: {
        restaurant: true,
        users: {
          include: {
            user: true,
          },
        }
      },
    });
  }

  async getActiveShiftsByRestaurant(restaurantId: string) {
    return this.prisma.shift.findMany({
      where: {
        restaurantId,
        status: 'STARTED'
      },
      include: {
        restaurant: true,
        users: {
          include: {
            user: true
          }
        },
        orders: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });
  }
  
  async updateShiftStatus(shiftId: string, dto: UpdateShiftStatusDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: dto.status,
      },
      include: {
        restaurant: true,
        users: {
          include: {
            user: true,
          },
        }
      },
    });
  }

  async addUserToShift(shiftId: string, dto: ManageShiftUserDto) {
    const [shift, user] = await Promise.all([
      this.prisma.shift.findUnique({ where: { id: shiftId } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ]);

    if (!shift) throw new NotFoundException('Смена не найдена');
    if (!user) throw new NotFoundException('Пользователь не найден');

    const existingUser = await this.prisma.userShift.findFirst({
      where: {
        shiftId,
        userId: dto.userId,
      },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь уже добавлен в смену');
    }

    return this.prisma.userShift.create({
      data: {
        shiftId,
        userId: dto.userId,
      },
      include: {
        user: true,
        shift: true,
      },
    });
  }

  async removeUserFromShift(shiftId: string, userId: string) {
    const userShift = await this.prisma.userShift.findFirst({
      where: {
        shiftId,
        userId,
      },
    });

    if (!userShift) {
      throw new NotFoundException('Пользователь не найден в смене');
    }

    return this.prisma.userShift.delete({
      where: {
        id: userShift.id,
      },
    });
  }

  async getShiftDetails(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        restaurant: true,
        users: {
          include: {
            user: true,
          },
        },
        orders: true
      },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return shift;
  }

  async getAllShifts(query: GetShiftsDto) {
    const where: any = {};
    
    if (query.restaurantId) {
        where.restaurantId = query.restaurantId;
    }
    
    if (query.status) {
        where.status = query.status;
    }

    // Убедимся, что значения числовые
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
        this.prisma.shift.findMany({
            where,
            skip,
            take: limit, // используем limit вместо take
            include: {
                users: true,
                restaurant: true,
                orders: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        }),
        this.prisma.shift.count({ where }),
    ]);

    return {
        data: shifts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
  }
}