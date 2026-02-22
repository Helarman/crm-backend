import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnumOrderType, EnumPaymentMethod, EnumSurchargeType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested, IsDateString } from 'class-validator';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additiveIds?: string[];
}

export class PaymentDto {
  @ApiProperty({ enum: EnumPaymentMethod })
  @IsNotEmpty()
  method: EnumPaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class OrderSurchargeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  surchargeId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: EnumSurchargeType })
  @IsNotEmpty()
  type: EnumSurchargeType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
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
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Имя клиента (если не привязан к существующему)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shiftId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: EnumOrderType })
  @IsNotEmpty()
  type: EnumOrderType;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @ApiProperty({ type: Object, required: false })
  @IsOptional()
  deliveryZone?: {
    title: string;
    price: number;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numberOfPeople?: string;

  @ApiProperty()
  @IsNotEmpty()
  source: any;

  @ApiProperty({ type: [OrderSurchargeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderSurchargeDto)
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

  @ApiPropertyOptional({ description: 'Адрес доставки' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

   @ApiPropertyOptional({ description: 'Время доставки' })
  @IsOptional()
  @IsDateString() 
  deliveryTime?: string;  

  @ApiPropertyOptional({ description: 'Заметки к доставке' })
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional({ description: 'Подъезд' })
  @IsOptional()
  @IsString()
  deliveryEntrance?: string;

  @ApiPropertyOptional({ description: 'Домофон' })
  @IsOptional()
  @IsString()
  deliveryIntercom?: string;

  @ApiPropertyOptional({ description: 'Этаж' })
  @IsOptional()
  @IsString()
  deliveryFloor?: string;

  @ApiPropertyOptional({ description: 'Квартира/офис' })
  @IsOptional()
  @IsString()
  deliveryApartment?: string;

  @ApiPropertyOptional({ description: 'Комментарий для курьера' })
  @IsOptional()
  @IsString()
  deliveryCourierComment?: string;
}

export class AssignShiftDto {
  @ApiProperty({ description: 'ID смены' })
  @IsString()
  shiftId: string;
}