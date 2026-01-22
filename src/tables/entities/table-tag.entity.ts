import { ApiProperty } from '@nestjs/swagger';

export class TableTag {
  @ApiProperty({ description: 'ID тега' })
  id: string;

  @ApiProperty({ description: 'Название тега' })
  name: string;

  @ApiProperty({ description: 'Описание тега', required: false })
  description?: string;

  @ApiProperty({ description: 'Цвет тега', default: '#6B7280' })
  color: string;

  @ApiProperty({ description: 'Порядок сортировки', default: 0 })
  order: number;

  @ApiProperty({ description: 'Активен ли тег', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'ID ресторана' })
  restaurantId: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;
}