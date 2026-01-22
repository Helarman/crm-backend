import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsNotEmpty, 
  IsEnum,
  Min,
  Max 
} from 'class-validator';
import { TableShape, TableStatus } from '../entities/table.entity';

export class CreateTableDto {
  @ApiProperty({ description: 'Название стола' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Описание стола' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Количество мест' })
  @IsNumber()
  @Min(1)
  seats: number;

  @ApiPropertyOptional({ 
    description: 'Форма стола',
    enum: TableShape,
    default: TableShape.RECTANGLE 
  })
  @IsEnum(TableShape)
  @IsOptional()
  shape?: TableShape;

  @ApiPropertyOptional({ 
    description: 'Статус стола',
    enum: TableStatus,
    default: TableStatus.AVAILABLE 
  })
  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

  @ApiProperty({ description: 'ID зала' })
  @IsString()
  @IsNotEmpty()
  hallId: string;

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

  @ApiPropertyOptional({ description: 'Цвет стола в HEX формате', default: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Порядок сортировки', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;

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