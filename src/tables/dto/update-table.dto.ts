import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsEnum,
  Min,
  Max 
} from 'class-validator';
import { TableShape, TableStatus } from '../entities/table.entity';

export class UpdateTableDto {
  @ApiPropertyOptional({ description: 'Название стола' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Описание стола' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Количество мест' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  seats?: number;

  @ApiPropertyOptional({ description: 'Форма стола', enum: TableShape })
  @IsEnum(TableShape)
  @IsOptional()
  shape?: TableShape;

  @ApiPropertyOptional({ description: 'Статус стола', enum: TableStatus })
  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Позиция X на плане' })
  @IsNumber()
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Позиция Y на плане' })
  @IsNumber()
  @IsOptional()
  positionY?: number;

  @ApiPropertyOptional({ description: 'Ширина стола (для прямоугольных столов)' })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Высота стола (для прямоугольных столов)' })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Радиус стола (для круглых столов)' })
  @IsNumber()
  @IsOptional()
  radius?: number;

  @ApiPropertyOptional({ description: 'Цвет стола в HEX формате' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки' })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Активен ли стол', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID родительского стола (для объединенных столов)' })
  @IsString()
  @IsOptional()
  parentTableId?: string;

  @ApiPropertyOptional({ description: 'ID тегов стола' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}