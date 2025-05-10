import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {  EnumOrderType as OrderType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class MarkupDto {
  @ApiProperty({ example: 'Наценка за банкет', description: 'Название наценки' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Дополнительный сервис', description: 'Описание наценки' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10, description: 'Размер наценки в процентах' })
  @IsInt()
  value: number;

  @ApiPropertyOptional({ example: true, description: 'Активна ли наценка', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: [OrderType.BANQUET], enum: OrderType, isArray: true, description: 'Типы заказов, к которым применяется наценка' })
  @IsArray()
  @IsEnum(OrderType, { each: true })
  orderTypes: OrderType[];
}