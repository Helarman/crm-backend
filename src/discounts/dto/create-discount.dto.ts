import { ApiProperty } from '@nestjs/swagger';
import { DiscountType, DiscountTargetType, DayOfWeek, EnumOrderType as OrderType} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class RestaurantDiscountDto {
  @ApiProperty()
  restaurantId: string;
}

class CategoryDiscountDto {
  @ApiProperty()
  categoryId: string;
}

class ProductDiscountDto {
  @ApiProperty()
  productId: string;
}

export class CreateDiscountDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty({ enum: DiscountTargetType })
  @IsEnum(DiscountTargetType)
  targetType: DiscountTargetType;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RestaurantDiscountDto)
  restaurants?: RestaurantDiscountDto[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CategoryDiscountDto)
  categories?: CategoryDiscountDto[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductDiscountDto)
  products?: ProductDiscountDto[];

  @ApiProperty({ enum: OrderType, isArray: true })
  @IsArray()
  @IsEnum(OrderType, { each: true })
  orderTypes: OrderType[];

  @ApiProperty({ enum: DayOfWeek, isArray: true, required: false })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  @IsOptional()
  daysOfWeek?: DayOfWeek[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  endDate?: Date;
}