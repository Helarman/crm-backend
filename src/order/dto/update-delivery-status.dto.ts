import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EnumOrderStatus } from '@prisma/client';

export class UpdateDeliveryStatusDto {
  @ApiProperty({ 
    description: 'Новый статус доставки',
    enum: EnumOrderStatus,
    examples: [EnumOrderStatus.DELIVERING, EnumOrderStatus.COMPLETED]
  })
  @IsEnum(EnumOrderStatus)
  status: EnumOrderStatus;
}