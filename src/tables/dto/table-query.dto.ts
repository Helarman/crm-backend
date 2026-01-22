import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsEnum,
  Min,
  Max 
} from 'class-validator';
import { TableStatus } from '../entities/table.entity';
import { Type } from 'class-transformer';

export class TableQueryDto {
  @ApiPropertyOptional({ description: 'ID ресторана' })
  @IsString()
  @IsOptional()
  restaurantId?: string;

  @ApiPropertyOptional({ description: 'ID зала' })
  @IsString()
  @IsOptional()
  hallId?: string;

  @ApiPropertyOptional({ description: 'Статус стола', enum: TableStatus })
  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Минимальное количество мест' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  minSeats?: number;

  @ApiPropertyOptional({ description: 'Максимальное количество мест' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSeats?: number;

  @ApiPropertyOptional({ description: 'ID тега' })
  @IsString()
  @IsOptional()
  tagId?: string;

  @ApiPropertyOptional({ description: 'Включать неактивные столы', default: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Только объединенные столы', default: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  onlyCombined?: boolean;

  @ApiPropertyOptional({ description: 'Только основные столы (не дочерние)', default: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  onlyMainTables?: boolean;

  @ApiPropertyOptional({ description: 'Номер страницы', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Количество элементов на странице', 
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}