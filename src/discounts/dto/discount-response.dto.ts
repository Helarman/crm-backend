import { ApiProperty } from '@nestjs/swagger';
import { Discount, DiscountTargetType, DiscountType, EnumOrderType as OrderType, DayOfWeek, EnumOrderType } from '@prisma/client';

export class DiscountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string; // Убрали опциональность

  @ApiProperty({ enum: DiscountType })
  type: DiscountType;

  @ApiProperty()
  value: number;

  @ApiProperty({ enum: DiscountTargetType })
  targetType: DiscountTargetType;

  @ApiProperty({ required: false })
  minOrderAmount?: number;

  @ApiProperty({ type: [String], enum: EnumOrderType })
  orderTypes: EnumOrderType[];

  @ApiProperty({ type: [String], enum: DayOfWeek })
  daysOfWeek: DayOfWeek[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  maxUses?: number;

  @ApiProperty()
  currentUses: number;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ type: () => [RestaurantDiscountDto], required: false })
  restaurants?: RestaurantDiscountDto[];

  @ApiProperty({ type: () => [CategoryDiscountDto], required: false })
  categories?: CategoryDiscountDto[];

  @ApiProperty({ type: () => [ProductDiscountDto], required: false })
  products?: ProductDiscountDto[];
}

class RestaurantDiscountDto {
  @ApiProperty()
  restaurant: {
    id: string;
    title: string;
  };
}

class CategoryDiscountDto {
  @ApiProperty()
  category: {
    id: string;
    title: string;
  };
}

class ProductDiscountDto {
  @ApiProperty()
  product: {
    id: string;
    title: string;
  };
}