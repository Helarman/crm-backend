import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnumOrderItemStatus } from '@prisma/client';
import { OrderItemStatus } from '../types';

export class UpdateOrderItemStatusDto {
  @ApiProperty({ enum: OrderItemStatus })
  @IsEnum(OrderItemStatus)
  status: OrderItemStatus;
  
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}