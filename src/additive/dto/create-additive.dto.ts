import { ApiProperty } from '@nestjs/swagger';

export class CreateAdditiveDto {
  @ApiProperty({ example: 'Без лука', description: 'Название добавки' })
  title: string;

  @ApiProperty({ example: 50, description: 'Цена добавки' })
  price: number;
}