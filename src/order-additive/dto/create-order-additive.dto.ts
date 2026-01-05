import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, IsPositive, IsNotEmpty } from 'class-validator';
import { OrderAdditiveType, EnumOrderType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateOrderAdditiveDto {
  @ApiProperty({ description: 'Название модификатора заказа' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Описание модификатора заказа' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Цена модификатора в копейках' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ 
    description: 'Тип модификатора заказа', 
    enum: OrderAdditiveType,
    default: OrderAdditiveType.FIXED 
  })
  @IsEnum(OrderAdditiveType)
  @IsOptional()
  type?: OrderAdditiveType = OrderAdditiveType.FIXED;

  @ApiProperty({ 
    description: 'Типы заказов, к которым применяется модификатор',
    enum: EnumOrderType,
    isArray: true 
  })
  @IsArray()
  @IsEnum(EnumOrderType, { each: true })
  @IsNotEmpty()
  orderTypes: EnumOrderType[];

  @ApiPropertyOptional({ description: 'ID инвентарного товара' })
  @IsString()
  @IsOptional()
  inventoryItemId?: string;

  @ApiPropertyOptional({ description: 'Количество ингредиента при использовании', default: 1.0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ingredientQuantity?: number = 1.0;

  @ApiPropertyOptional({ description: 'ID сети' })
  @IsString()
  @IsOptional()
  networkId?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки', default: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number = 0;

  @ApiPropertyOptional({ description: 'Активен ли модификатор', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}