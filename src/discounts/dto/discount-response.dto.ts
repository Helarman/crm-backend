import { ApiProperty } from '@nestjs/swagger';
import { Discount, DiscountTargetType, DiscountType, EnumOrderType as OrderType, DayOfWeek } from '@prisma/client';

export class DiscountResponseDto implements Discount {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: DiscountType })
  type: DiscountType;

  @ApiProperty()
  value: number;

  @ApiProperty({ enum: DiscountTargetType })
  targetType: DiscountTargetType;

  @ApiProperty({ nullable: true })
  minOrderAmount: number | null;

  @ApiProperty({ enum: OrderType, isArray: true })
  orderTypes: OrderType[];

  @ApiProperty({ enum: DayOfWeek, isArray: true })
  daysOfWeek: DayOfWeek[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  code: string | null;

  @ApiProperty({ nullable: true })
  maxUses: number | null;

  @ApiProperty()
  currentUses: number;

  @ApiProperty({ nullable: true })
  startDate: Date | null;

  @ApiProperty({ nullable: true })
  endDate: Date | null;
}