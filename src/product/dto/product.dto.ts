import { ArrayMinSize, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty({
    type: String,
    example: 'Пицца "Маргарита"',
    description: 'Название товара',
    required: true
  })
  @IsString({ message: 'Название обязательно' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  title: string;

  @ApiProperty({
    type: String,
    example: 'Классическая пицца с томатами и сыром',
    description: 'Подробное описание товара',
    required: true
  })
  @IsString({ message: 'Описание обязательно' })
  @IsNotEmpty({ message: 'Описание не может быть пустым' })
  description: string;

  @ApiProperty({
    type: String,
    example: 'Тесто, томатный соус, сыр моцарелла, помидоры, базилик',
    description: 'Состав продукта',
    required: true
  })
  @IsString({ message: 'Состав обязателен' })
  @IsNotEmpty({ message: 'Состав не может быть пустым' })
  ingredients: string;

  @ApiProperty({
    type: Number,
    example: 450,
    description: 'Цена товара в рублях',
    required: true
  })
  @IsNumber({}, { message: 'Цена должна быть числом' })
  @IsNotEmpty({ message: 'Цена не может быть пустой' })
  price: number;

  @ApiProperty({
    type: [String],
    example: [
      'https://example.com/pizza-margherita.jpg',
      'https://example.com/pizza-margherita-closeup.jpg'
    ],
    description: 'Ссылки на изображения товара',
    minItems: 1,
    required: true
  })
  @ArrayMinSize(1, { message: 'Должна быть хотя бы одна картинка' })
  @IsNotEmpty({
    each: true,
    message: 'Путь к картинке не может быть пустым'
  })
  images: string[];

  @ApiProperty({
    type: String,
    example: '654a14e8b9a8454d3e4e5f6d',
    description: 'ID категории товара',
    required: true
  })
  @IsString({ message: 'Категория обязательна' })
  @IsNotEmpty({ message: 'ID категории не может быть пустым' })
  categoryId: string;
}