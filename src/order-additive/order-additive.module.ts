import { Module } from '@nestjs/common';
import { OrderAdditiveService } from './order-additive.service';
import { OrderAdditiveController } from './order-additive.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [OrderAdditiveController],
  providers: [OrderAdditiveService, PrismaService],
  exports: [OrderAdditiveService],
})
export class OrderAdditiveModule {}