import { ApiProperty } from '@nestjs/swagger';

export class CreateAdditiveDto {
  @ApiProperty({ example: 'Без лука', description: 'Название Модификаторы' })
  title: string;

  @ApiProperty({ example: 50, description: 'Цена Модификаторы' })
  price: number;
}