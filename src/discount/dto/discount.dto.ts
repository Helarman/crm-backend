import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, DiscountTargetType, EnumOrderType as OrderType, DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DiscountDto {
  @ApiProperty({ example: 'Летняя скидка', description: 'Название скидки' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Скидка действует до конца лета', description: 'Описание скидки' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.GENERAL, description: 'Тип скидки' })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ example: 10, description: 'Размер скидки в процентах' })
  @IsInt()
  value: number;

  @ApiPropertyOptional({ example: true, description: 'Активна ли скидка', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: DiscountTargetType, example: DiscountTargetType.ALL, description: 'Тип цели скидки' })
  @IsOptional()
  @IsEnum(DiscountTargetType)
  targetType?: DiscountTargetType;

  @ApiPropertyOptional({ example: ['MONDAY', 'TUESDAY'], enum: DayOfWeek, isArray: true, description: 'Дни недели действия скидки' })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek?: DayOfWeek[];

  @ApiPropertyOptional({ example: '09:00', description: 'Время начала действия (формат HH:mm)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Время окончания действия (формат HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: [OrderType.DINE_IN, OrderType.TAKEAWAY], enum: OrderType, isArray: true, description: 'Типы заказов, к которым применяется скидка' })
  @IsOptional()
  @IsArray()
  @IsEnum(OrderType, { each: true })
  orderTypes?: OrderType[];

  @ApiPropertyOptional({ example: 'SUMMER2023', description: 'Промокод (для промо-акций)' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ example: true, description: 'Является ли кэшбэком' })
  @IsOptional()
  @IsBoolean()
  isCashback?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Процент кэшбэка' })
  @IsOptional()
  @IsInt()
  cashbackValue?: number;
}

export class ApplyDiscountDto {
  @ApiProperty({ example: 'clnjak7xj000008l0a1qj3e9v', description: 'ID заказа' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ example: 'SUMMER2023', description: 'Промокод (если применяется)' })
  @IsOptional()
  @IsString()
  promoCode?: string;
}