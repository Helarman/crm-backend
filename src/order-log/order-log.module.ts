import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderLogController } from './order-log.controller';
import { OrderLogService } from './order-log.service';

@Module({
  controllers: [OrderLogController],
  providers: [OrderLogService, PrismaService],
  exports: [OrderLogService],
})
export class OrderLogModule {}