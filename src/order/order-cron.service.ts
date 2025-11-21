import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { OrderGateway } from './order.gateway';
import { OrderService } from './order.service';
import { EnumOrderItemStatus } from '@prisma/client';

@Injectable()
export class OrderSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(OrderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderGateway: OrderGateway,
    private readonly orderService: OrderService,
  ) {}

  onModuleInit() {
    this.logger.log('Order Scheduler Service initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE) 
  async handleScheduledOrders() {
    const now = new Date();
    this.logger.debug(`Order auto scheduler. Time: ${now}`);

    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const ordersToUpdate = await this.prisma.order.findMany({
        where: {
          status: 'CONFIRMED',
          scheduledAt: {
            not: null,
            gte: oneHourLater
          },    
        },
        include: {
          items: {
            where: {
              status: {
                in: ['CREATED'] 
              }
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

      this.logger.log(`Found ${ordersToUpdate.length} orders to update to PREPARING`);

      for (const order of ordersToUpdate) {
        try {
          this.logger.log(`Updating order ${order.number} to PREPARING (scheduled at: ${order.scheduledAt}, current time: ${now})`);
          
          const updatedOrder = await this.prisma.$transaction(async (prisma) => {
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: { status: 'PREPARING' },
              include: this.orderService['getOrderInclude'](), 
            });

            if (order.items.length > 0) {
              await prisma.orderItem.updateMany({
                where: { 
                  orderId: order.id,
                  status: {
                    in: ['CREATED',] 
                  }
                },
                data: { 
                  status: EnumOrderItemStatus.IN_PROGRESS,
                  startedAt: new Date()
                },
              });
            }

            return updatedOrder;
          });

          const response = this.orderService['mapToResponse'](updatedOrder);
          
          await this.orderGateway.notifyOrderStatusUpdated(response);
          
          for (const item of order.items) {
            await this.orderGateway.notifyOrderItemStatusUpdated(response, item.id);
          }
          
          this.logger.log(`Successfully updated order ${order.number} to PREPARING and ${order.items.length} items to IN_PROGRESS`);
        } catch (error) {
          this.logger.error(`Failed to update order ${order.number}: ${error.message}`);
        }
      }

      if (ordersToUpdate.length > 0) {
        this.logger.log(`Processed ${ordersToUpdate.length} scheduled orders`);
      }
    } catch (error) {
      this.logger.error(`Error in scheduled orders handler: ${error.message}`);
    }
  }

  async moveToPreparingImmediately(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            where: {
              status: {
                in: ['CREATED']
              }
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

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'CONFIRMED') {
        throw new Error(`Order status is ${order.status}, expected CONFIRMED`);
      }

      if (!order.scheduledAt) {
        throw new Error('Order does not have scheduled time');
      }

      const updatedOrder = await this.prisma.$transaction(async (prisma) => {
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PREPARING' },
          include: this.orderService['getOrderInclude'](),
        });

        if (order.items.length > 0) {
          await prisma.orderItem.updateMany({
            where: { 
              orderId: orderId,
              status: {
                in: ['CREATED']
              }
            },
            data: { 
              status: EnumOrderItemStatus.IN_PROGRESS,
              startedAt: new Date()
            },
          });
        }

        return updatedOrder;
      });

      const response = this.orderService['mapToResponse'](updatedOrder);
      
      await this.orderGateway.notifyOrderStatusUpdated(response);
      
      for (const item of order.items) {
        await this.orderGateway.notifyOrderItemStatusUpdated(response, item.id);
      }

      this.logger.log(`Order ${order.number} moved to PREPARING immediately and ${order.items.length} items to IN_PROGRESS`);
    } catch (error) {
      this.logger.error(`Failed to move order to PREPARING: ${error.message}`);
      throw error;
    }
  }
}