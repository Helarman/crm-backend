import { ApiProperty } from '@nestjs/swagger';
import { DeliveryZone as PrismaDeliveryZone } from '@prisma/client';

export class DeliveryZoneEntity implements PrismaDeliveryZone {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false })
  minOrder: number;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: Object, required: false })
  polygon: string;

  constructor(partial: Partial<DeliveryZoneEntity>) {
    Object.assign(this, partial);
  }
}
