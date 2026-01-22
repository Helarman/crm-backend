import { ApiProperty } from '@nestjs/swagger';
import { Table } from './table.entity';

export class Hall {
  @ApiProperty({ description: 'ID зала' })
  id: string;

  @ApiProperty({ description: 'Название зала' })
  title: string;

  @ApiProperty({ description: 'Описание зала', required: false })
  description?: string;

  @ApiProperty({ description: 'Полигон плана зала', required: false })
  polygon?: string;

  @ApiProperty({ description: 'Цвет зала', default: '#3B82F6' })
  color: string;

  @ApiProperty({ description: 'Порядок сортировки', default: 0 })
  order: number;

  @ApiProperty({ description: 'Активен ли зал', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'ID ресторана' })
  restaurantId: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ description: 'Столы в зале', type: [Table], required: false })
  tables?: Table[];
}