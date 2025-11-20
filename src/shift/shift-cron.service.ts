// src/shift/shift-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShiftCronService {
  private readonly logger = new Logger(ShiftCronService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseShifts() {
    try {
      const now = new Date();
      this.logger.debug(`Shift auto closing. Time: ${now}`);

      const activeShifts = await this.prisma.shift.findMany({
        where: {
          status: 'STARTED',
        },
        include: {
          restaurant: {
            select: {
              id: true,
              title: true,
              shiftCloseTime: true,
            },
          },
        },
      });

      let closedCount = 0;

      for (const shift of activeShifts) {
        const restaurantCloseTime = shift.restaurant.shiftCloseTime;
        
        const autoCloseTime = new Date(shift.startTime);
        autoCloseTime.setHours(
          restaurantCloseTime.getHours(),
          restaurantCloseTime.getMinutes(),
          restaurantCloseTime.getSeconds(),
          0
        );

        if (autoCloseTime <= shift.startTime) {
          autoCloseTime.setDate(autoCloseTime.getDate() + 1);
        }

        if (now >= autoCloseTime) {
          await this.prisma.shift.update({
            where: { id: shift.id },
            data: {
              status: 'COMPLETED',
              endTime: now, 
            },
          });

          closedCount++;
        }
      }

    } catch (error) {
      this.logger.error(error);
    }
  }

  async debugShiftClosure() {
    const now = new Date();
    const activeShifts = await this.prisma.shift.findMany({
      where: {
        status: 'STARTED',
      },
      include: {
        restaurant: {
          select: {
            title: true,
            shiftCloseTime: true,
          },
        },
      },
    });

    const debugInfo = activeShifts.map(shift => {
      const closeTime = new Date(shift.startTime);
      const restaurantCloseTime = shift.restaurant.shiftCloseTime;
      
      closeTime.setHours(
        restaurantCloseTime.getHours(),
        restaurantCloseTime.getMinutes(),
        restaurantCloseTime.getSeconds(),
        0
      );

      if (closeTime <= shift.startTime) {
        closeTime.setDate(closeTime.getDate() + 1);
      }

      const shouldClose = now >= closeTime;
      const timeUntilClose = closeTime.getTime() - now.getTime();
      
      return {
        shiftId: shift.id,
        restaurant: shift.restaurant.title,
        startTime: shift.startTime.toISOString(),
        restaurantCloseTime: shift.restaurant.shiftCloseTime.toTimeString(),
        calculatedCloseTime: closeTime.toISOString(),
        shouldClose,
        timeUntilClose: timeUntilClose > 0 ? 
          Math.round(timeUntilClose / 1000 / 60) + ' минут' : 
          'ПРОСРОЧЕНО на ' + Math.round(-timeUntilClose / 1000 / 60) + ' минут'
      };
    });

    return debugInfo;
  }

  async manuallyCheckShiftClosure() {
    await this.autoCloseShifts();
  }
}