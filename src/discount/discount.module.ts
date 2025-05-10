import { Module } from '@nestjs/common';
import { DiscountController } from './discount.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [DiscountController],
  providers: [ PrismaService]
})
export class DiscountModule {}