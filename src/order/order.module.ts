import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma.service';
import { OrderGateway } from './order.gateway';
import { OrderSchedulerService } from './order-cron.service';
import { CustomerModule } from '../customer/customer.module';

@Module({
  imports: [CustomerModule], 
  controllers: [OrderController],
  providers: [OrderService, PrismaService, OrderGateway, OrderSchedulerService],
  exports: [OrderService],
})
export class OrderModule {}