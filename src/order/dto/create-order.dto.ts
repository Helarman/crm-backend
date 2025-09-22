import { ApiProperty } from '@nestjs/swagger';
import { EnumOrderType, EnumPaymentMethod, EnumSurchargeType } from '@prisma/client';

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

export class CreateOrderDto {
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
  tableNumber?: string;

  @ApiProperty({ required: false })
  numberOfPeople?: string;

  @ApiProperty()
  source: any;

  @ApiProperty({ type: [OrderSurchargeDto], required: false })
  surcharges?: OrderSurchargeDto[];
}