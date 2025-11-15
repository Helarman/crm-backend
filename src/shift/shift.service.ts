import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { ManageShiftUserDto } from './dto/manage-shift-user.dto';
import { ManageShiftOrderDto } from './dto/manage-shift-order.dto';
import { GetShiftsDto } from './dto/get-shifts.dto';
import { CreateShiftIncomeDto, UpdateShiftIncomeDto } from './dto/shift-income.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

 async createShift(dto: CreateShiftDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
      select: {
        id: true,
        shiftCloseTime: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Ресторан не найден');
    }

    // Если смена создается со статусом STARTED, устанавливаем автоматическое время окончания
    let endTime = dto.endTime;
    
    if (dto.status === 'STARTED' && !endTime) {
      const startTime = new Date(dto.startTime);
      const closeTime = restaurant.shiftCloseTime;
      
      // Устанавливаем время окончания на основе времени закрытия ресторана
      const autoEndTime = new Date(startTime);
      autoEndTime.setHours(
        closeTime.getHours(),
        closeTime.getMinutes(),
        closeTime.getSeconds(),
        0
      );
      
      // Если автоматическое время окончания раньше времени начала, 
      // устанавливаем на следующий день
      if (autoEndTime <= startTime) {
        autoEndTime.setDate(autoEndTime.getDate() + 1);
      }
      
      endTime = autoEndTime;
    }

    return this.prisma.shift.create({
      data: {
        restaurantId: dto.restaurantId,
        status: dto.status,
        startTime: dto.startTime,
        endTime: endTime,
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

  async updateShiftStatus(shiftId: string, dto: UpdateShiftStatusDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        restaurant: {
          select: {
            shiftCloseTime: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === 'STARTED' && !shift.endTime) {
      const startTime = shift.startTime;
      const closeTime = shift.restaurant.shiftCloseTime;
      
      const autoEndTime = new Date(startTime);
      autoEndTime.setHours(
        closeTime.getHours(),
        closeTime.getMinutes(),
        closeTime.getSeconds(),
        0
      );
      
      if (autoEndTime <= startTime) {
        autoEndTime.setDate(autoEndTime.getDate() + 1);
      }
      
      updateData.endTime = autoEndTime;
    }
    
    // Если смена закрывается, устанавливаем время окончания
    if (dto.status === 'COMPLETED' && !shift.endTime) {
      updateData.endTime = new Date();
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: updateData,
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

  async getShiftAutoCloseTime(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        restaurant: {
          select: {
            shiftCloseTime: true,
            title: true,
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    if (shift.status !== 'STARTED') {
      throw new BadRequestException('Смена уже закрыта или не активна');
    }

    const startTime = shift.startTime;
    const closeTime = shift.restaurant.shiftCloseTime;
    
    const autoCloseTime = new Date(startTime);
    autoCloseTime.setHours(
      closeTime.getHours(),
      closeTime.getMinutes(),
      closeTime.getSeconds(),
      0
    );
    
    if (autoCloseTime <= startTime) {
      autoCloseTime.setDate(autoCloseTime.getDate() + 1);
    }

    return {
      shiftId: shift.id,
      restaurant: shift.restaurant.title,
      startTime: shift.startTime,
      autoCloseTime,
      restaurantCloseTime: closeTime,
    };
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
        orders: {
          include: {
            payment: true, 
          },
        }
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

    async addExpenseToShift(shiftId: string, dto: { title: string; amount: number; description?: string }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return this.prisma.shiftExpense.create({
      data: {
        shiftId,
        title: dto.title,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  async getShiftExpenses(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return this.prisma.shiftExpense.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeExpense(expenseId: string) {
    const expense = await this.prisma.shiftExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('Расход не найден');
    }

    return this.prisma.shiftExpense.delete({
      where: { id: expenseId },
    });
  }
  async updateExpense(expenseId: string, dto: { title?: string; amount?: number; description?: string }) {
    const expense = await this.prisma.shiftExpense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new NotFoundException('Расход не найден');
    }

    return this.prisma.shiftExpense.update({
      where: { id: expenseId },
      data: {
        title: dto.title,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }
  async addIncomeToShift(shiftId: string, dto: CreateShiftIncomeDto) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return this.prisma.shiftIncome.create({
      data: {
        shiftId,
        title: dto.title,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  async getShiftIncomes(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Смена не найдена');
    }

    return this.prisma.shiftIncome.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeIncome(incomeId: string) {
    const income = await this.prisma.shiftIncome.findUnique({
      where: { id: incomeId },
    });

    if (!income) {
      throw new NotFoundException('Доход не найден');
    }

    return this.prisma.shiftIncome.delete({
      where: { id: incomeId },
    });
  }

  async updateIncome(incomeId: string, dto: UpdateShiftIncomeDto) {
    const income = await this.prisma.shiftIncome.findUnique({
      where: { id: incomeId },
    });

    if (!income) {
      throw new NotFoundException('Доход не найден');
    }

    return this.prisma.shiftIncome.update({
      where: { id: incomeId },
      data: {
        title: dto.title,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

}