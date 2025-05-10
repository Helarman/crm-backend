import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({
    example: 'Напитки',
    description: 'Название категории',
    required: true,
  })
  @IsString({ message: 'Название обязательно' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  title: string;

  @ApiProperty({
    example: 'Холодные напитки, чай, кофе и тд.',
    description: 'Описание категории',
    required: true,
  })
  @IsString({ message: 'Описание обязательно' })
  @IsNotEmpty({ message: 'Описание не может быть пустым' })
  description: string;
}