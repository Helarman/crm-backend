import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumOrderType, EnumPaymentMethod, EnumSurchargeType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ type: [String], required: false })
  additiveIds?: string[];
}

export class PaymentDto {
  @ApiProperty()
  method: EnumPaymentMethod;

  @ApiProperty({ required: false })
  externalId?: string;
}
export class OrderSurchargeDto {
  @ApiProperty()
  surchargeId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: EnumSurchargeType })
  type: EnumSurchargeType;

  @ApiProperty({ required: false })
  description?: string;
}


export class OrderAdditiveDto {
  @ApiProperty({ description: 'ID модификатора заказа' })
  @IsString()
  @IsNotEmpty()
  orderAdditiveId: string;

  @ApiPropertyOptional({ description: 'Количество', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID стола', required: false })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiProperty({ description: 'Номер стола (для обратной совместимости)', required: false })
  @IsString()
  @IsOptional()
  tableNumber?: string;

  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty({ required: false })
  shiftId?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty()
  type: EnumOrderType;

  @ApiProperty({ type: [OrderItemDto] })
  items: OrderItemDto[];

  @ApiProperty({ required: false })
  scheduledAt?: Date;

  @ApiProperty({ required: false })
  comment?: string;

  @ApiProperty({ required: false })
  payment?: PaymentDto;

  @ApiProperty({ required: false })
  deliveryAddress?: string;

  @ApiProperty({ required: false })
  deliveryTime?: Date;

  @ApiProperty({ required: false })
  deliveryNotes?: string;

  @ApiProperty({ type: Object, required: false })
  deliveryZone?: {
    title: string;
    price: number;
  };

  @ApiProperty({ required: false })
  numberOfPeople?: string;

  @ApiProperty()
  source: any;

  @ApiProperty({ type: [OrderSurchargeDto], required: false })
  surcharges?: OrderSurchargeDto[];
  @ApiPropertyOptional({
    description: 'Модификаторы заказа (дополнительные услуги)',
    type: [OrderAdditiveDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderAdditiveDto)
  orderAdditives?: OrderAdditiveDto[];
}


export class AssignShiftDto {
  @ApiProperty({ description: 'ID смены' })
  @IsString()
  shiftId: string;
}