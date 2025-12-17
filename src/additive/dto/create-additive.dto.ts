import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateAdditiveDto {
  @ApiProperty({ example: 'Без лука', description: 'Название Модификаторы' })
  title: string;

  @ApiProperty({ example: 50, description: 'Цена Модификаторы' })
  price: number;

  @ApiProperty({ 
    example: 'clf8x2z8s000008l5b4rq8e9a', 
    description: 'ID сети (необязательно)', 
    required: false 
  })
  @IsString()
  networkId?: string;

}