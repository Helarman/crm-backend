import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateHallDto {
  @ApiPropertyOptional({ description: 'Название зала' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Описание зала' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'GeoJSON полигон для плана зала' })
  @IsString()
  @IsOptional()
  polygon?: string;

  @ApiPropertyOptional({ description: 'Цвет зала в HEX формате' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Активен ли зал', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}