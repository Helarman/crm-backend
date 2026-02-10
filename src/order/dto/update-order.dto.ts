import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { EnumOrderType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiProperty({ description: 'ID стола (null чтобы отвязать)', required: false })
  @IsString()
  @IsOptional()
  tableId?: string | null;
  
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
  
  @ApiProperty({ required: false })
  phone?: string;
  
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