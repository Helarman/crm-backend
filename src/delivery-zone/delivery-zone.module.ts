import { Module } from '@nestjs/common';
import { DeliveryZoneService } from './delivery-zone.service';
import { DeliveryZoneController } from './delivery-zone.controller';
import { PrismaService } from 'src/prisma.service';;

@Module({
  controllers: [DeliveryZoneController],
  providers: [DeliveryZoneService, PrismaService],
  exports: [DeliveryZoneService],
})

export class DeliveryZoneModule {}