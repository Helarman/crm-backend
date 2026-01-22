import { ApiProperty } from '@nestjs/swagger';
import { TableTag } from './table-tag.entity';

export enum TableShape {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  OVAL = 'OVAL'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  CLEANING = 'CLEANING'
}

export class Table {
  @ApiProperty({ description: 'ID стола' })
  id: string;

  @ApiProperty({ description: 'Название стола' })
  name: string;

  @ApiProperty({ description: 'Описание стола', required: false })
  description?: string;

  @ApiProperty({ description: 'Количество мест' })
  seats: number;

  @ApiProperty({ 
    description: 'Форма стола',
    enum: TableShape,
    default: TableShape.RECTANGLE 
  })
  shape: TableShape;

  @ApiProperty({ 
    description: 'Статус стола',
    enum: TableStatus,
    default: TableStatus.AVAILABLE 
  })
  status: TableStatus;

  @ApiProperty({ description: 'Позиция X на плане', required: false })
  positionX?: number;

  @ApiProperty({ description: 'Позиция Y на плане', required: false })
  positionY?: number;

  @ApiProperty({ description: 'Ширина стола', required: false })
  width?: number;

  @ApiProperty({ description: 'Высота стола', required: false })
  height?: number;

  @ApiProperty({ description: 'Радиус стола', required: false })
  radius?: number;

  @ApiProperty({ description: 'Цвет стола', default: '#3B82F6' })
  color: string;

  @ApiProperty({ description: 'Порядок сортировки', default: 0 })
  order: number;

  @ApiProperty({ description: 'Активен ли стол', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'ID зала' })
  hallId: string;

  @ApiProperty({ description: 'ID родительского стола', required: false })
  parentTableId?: string;

  @ApiProperty({ description: 'ID текущего заказа', required: false })
  currentOrderId?: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Теги стола', type: [TableTag], required: false })
  tags?: TableTag[];

  @ApiProperty({ description: 'Дочерние столы', type: [Table], required: false })
  childTables?: Table[];

  @ApiProperty({ description: 'Родительский стол', type: Table, required: false })
  parentTable?: Table;
}