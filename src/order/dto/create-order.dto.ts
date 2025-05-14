import { ApiProperty } from '@nestjs/swagger';
import { EnumOrderType, EnumPaymentMethod } from '@prisma/client';

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

export class CreateOrderDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty({ required: false })
  shiftId?: string;

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

  deliveryZone: {
    title: string
    price: number
  }
  tableNumber?: string

  numberOfPeople?: string

  source: any
}