import { ApiProperty } from '@nestjs/swagger';
import { DiscountType, DiscountTargetType } from '@prisma/client';
import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, IsEnum } from 'class-validator';

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

  @ApiProperty({ enum: DiscountTargetType, default: DiscountTargetType.ALL })
  @IsEnum(DiscountTargetType)
  targetType: DiscountTargetType = DiscountTargetType.ALL;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  startTime?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  endTime?: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean = true;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restaurantIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];
}

export class UpdateDiscountDto extends CreateDiscountDto {
  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restaurantIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];
}

export class DiscountResponseDto {
  id: string;
  title: string;
  description?: string;
  type: DiscountType;
  value: number;
  targetType: DiscountTargetType;
  minOrderAmount?: number;
  startDate?: Date;
  endDate?: Date;
  startTime?: number;
  endTime?: number;
  isActive: boolean;
  code?: string;
  maxUses?: number;
  currentUses: number;
  restaurants?: any[];
  products?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export class ApplyDiscountDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  discountId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class GeneratePromoCodeDto {
  @ApiProperty()
  @IsString()
  discountId: string;

  @ApiProperty()
  @IsString()
  customerId: string;
}

export class ProductDiscountsDto {
  @ApiProperty({
    description: 'Array of product IDs',
    type: [String],
    example: ['d9f80740-38f0-11e8-b467-0ed5f89f718b', 'd9f80920-38f0-11e8-b467-0ed5f89f718b'],
  })
  @IsArray()
  productIds: string[];
}