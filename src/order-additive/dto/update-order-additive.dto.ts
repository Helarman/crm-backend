import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateOrderAdditiveDto } from './create-order-additive.dto';
import { IsOptional, IsArray } from 'class-validator';
import { EnumOrderType } from '@prisma/client';

export class UpdateOrderAdditiveDto extends PartialType(CreateOrderAdditiveDto) {
  @ApiPropertyOptional({ 
    description: 'Типы заказов, к которым применяется модификатор',
    enum: EnumOrderType,
    isArray: true 
  })
  @IsArray()
  @IsOptional()
  orderTypes?: EnumOrderType[];
}