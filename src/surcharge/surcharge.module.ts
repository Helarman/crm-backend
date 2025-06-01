import { Module } from '@nestjs/common';
import { SurchargeService } from './surcharge.service';
import { SurchargeController } from './surcharge.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [SurchargeController],
  providers: [SurchargeService, PrismaService],
  exports: [SurchargeService] 
})
export class SurchargeModule {}