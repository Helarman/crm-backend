import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateTableTagDto {
  @ApiProperty({ description: 'Название тега' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Описание тега' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID ресторана' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiPropertyOptional({ description: 'Цвет тега в HEX формате', default: '#6B7280' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;
}