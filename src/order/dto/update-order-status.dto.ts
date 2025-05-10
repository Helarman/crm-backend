import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { EnumOrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: EnumOrderStatus,
    example: EnumOrderStatus.CONFIRMED,
    description: 'New status for the order'
  })
  @IsNotEmpty()
  @IsEnum(EnumOrderStatus, {
    message: `Status must be one of: ${Object.values(EnumOrderStatus).join(', ')}`
  })
  status: EnumOrderStatus;
}