import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { EnumOrderType } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(EnumOrderType)
  type?: EnumOrderType;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsNumber()
  numberOfPeople?: number;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}