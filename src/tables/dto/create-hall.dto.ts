import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsNotEmpty } from 'class-validator';

export class CreateHallDto {
  @ApiProperty({ description: 'Название зала' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Описание зала' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID ресторана' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiPropertyOptional({ description: 'GeoJSON полигон для плана зала' })
  @IsString()
  @IsOptional()
  polygon?: string;

  @ApiPropertyOptional({ description: 'Цвет зала в HEX формате', default: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}