import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderTableController } from './order-table.controller';
import { OrderTableService } from './order-table.service';

@Module({
  controllers: [OrderTableController],
  providers: [OrderTableService, PrismaService],
  exports: [OrderTableService],
})
export class OrderTableModule {}