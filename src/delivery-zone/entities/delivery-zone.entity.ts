import { ApiProperty } from '@nestjs/swagger';
import { DeliveryZone as PrismaDeliveryZone } from '@prisma/client';

export class DeliveryZoneEntity implements PrismaDeliveryZone {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ required: false, nullable: true })
  minOrder: number | null;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
  
  @ApiProperty({ 
    example: '#3B82F6',
    description: 'HEX color for the zone',
    default: '#3B82F6'
  })
  color: string;

  @ApiProperty({ 
    example: 1,
    description: 'Priority (higher number = higher priority)',
    default: 0
  })
  priority: number;

  @ApiProperty({ 
    description: 'Polygon coordinates in WKT format',
    example: 'POLYGON((30.1 10.1, 40.1 40.1, 20.1 40.1, 10.1 20.1, 30.1 10.1))'
  })
  polygon: string;

  constructor(partial: Partial<DeliveryZoneEntity>) {
    Object.assign(this, partial);
    
    if (!this.color) {
      this.color = '#3B82F6';
    }
    
    if (this.priority === undefined || this.priority === null) {
      this.priority = 0;
    }
  }
}