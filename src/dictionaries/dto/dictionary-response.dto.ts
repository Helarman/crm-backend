import { ApiProperty } from '@nestjs/swagger';

export class DictionaryResponseDto {
  @ApiProperty({ description: 'ID элемента' })
  id: number;

  @ApiProperty({ description: 'Наименование' })
  name: string;

  @ApiProperty({ description: 'Активен ли элемент' })
  isActive: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;
}