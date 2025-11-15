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
      this.logger.debug(`Проверка автоматического закрытия смен. Текущее время: ${now.toISOString()}`);

      // Находим все активные смены
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
        // Используем ту же логику расчета, что и в ShiftService
        const restaurantCloseTime = shift.restaurant.shiftCloseTime;
        
        // Создаем время закрытия на основе даты начала смены
        const autoCloseTime = new Date(shift.startTime);
        autoCloseTime.setHours(
          restaurantCloseTime.getHours(),
          restaurantCloseTime.getMinutes(),
          restaurantCloseTime.getSeconds(),
          0
        );

        // Если автоматическое время окончания раньше времени начала, 
        // устанавливаем на следующий день
        if (autoCloseTime <= shift.startTime) {
          autoCloseTime.setDate(autoCloseTime.getDate() + 1);
        }

        this.logger.debug(`Смена ${shift.id}: start=${shift.startTime.toISOString()}, autoClose=${autoCloseTime.toISOString()}, now=${now.toISOString()}`);

        // Если текущее время >= времени автоматического закрытия
        if (now >= autoCloseTime) {
          await this.prisma.shift.update({
            where: { id: shift.id },
            data: {
              status: 'COMPLETED',
              endTime: now, // Используем текущее время, а не расчетное
            },
          });

          this.logger.log(`Смена ${shift.id} автоматически закрыта. plannedClose=${autoCloseTime.toISOString()}, actualClose=${now.toISOString()}`);
          closedCount++;
        }
      }

      if (closedCount > 0) {
        this.logger.log(`Автоматически закрыто ${closedCount} смен`);
      } else {
        this.logger.debug('Нет смен для автоматического закрытия');
      }

    } catch (error) {
      this.logger.error('Ошибка при автоматическом закрытии смен:', error);
    }
  }

  // Метод для отладки - показывает какие смены будут закрыты
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