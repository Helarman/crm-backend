import { Module } from '@nestjs/common';
import { PaymentIntegrationService } from './payment-integration.service';
import { PaymentIntegrationController } from './payment-integration.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PaymentIntegrationController],
  providers: [PaymentIntegrationService, PrismaService],
  exports: [PaymentIntegrationService],
})
export class PaymentIntegrationModule {}