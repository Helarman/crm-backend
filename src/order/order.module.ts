import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../prisma.service';
import { OrderGateway } from './order.gateway';

@Module({
  controllers: [OrderController],
  providers: [OrderService, PrismaService, OrderGateway],
  exports: [OrderService],
})
export class OrderModule {}