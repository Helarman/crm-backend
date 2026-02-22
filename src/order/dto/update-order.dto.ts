import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { EnumOrderType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Имя клиента' })
  @IsOptional()
  @IsString()
  customerName?: string;

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

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}