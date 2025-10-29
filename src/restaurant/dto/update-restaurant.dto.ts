import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRestaurantDto {
  @ApiProperty({ description: 'Название ресторана', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Описание ресторана', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Адрес ресторана', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Изображения ресторана', type: [String], required: false })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ description: 'Широта', required: false })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiProperty({ description: 'Долгота', required: false })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiProperty({ description: 'Юридическая информация', required: false })
  @IsOptional()
  @IsString()
  legalInfo?: string;

  @ApiProperty({ description: 'ID сети ресторанов', required: false })
  @IsOptional()
  @IsString()
  networkId?: string;

  @ApiProperty({ 
    description: 'Использовать складскую систему', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  useWarehouse?: boolean;
}