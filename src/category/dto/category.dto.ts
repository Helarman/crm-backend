import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray } from 'class-validator';
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
    example: 'Напитки в нашем ресторане',
    description: 'Описание категории',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'drinks',
    description: 'URL-адрес категории',
    required: true,
  })
  @IsString({ message: 'URL-адрес обязателен' })
  @IsNotEmpty({ message: 'URL-адрес не может быть пустым' })
  slug: string;

  @ApiProperty({
    example: '/uploads/categories/drinks.jpg',
    description: 'Изображение категории',
    required: false,
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({
    example: 'Напитки - лучшие предложения',
    description: 'Мета-заголовок для SEO',
    required: false,
  })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({
    example: 'Широкий выбор напитков в нашем ресторане',
    description: 'Мета-описание для SEO',
    required: false,
  })
  @IsString()
  @IsOptional()
  metaDescription?: string;

   @ApiProperty({
    example: '<h1>О напитках</h1><p>Подробный контент о напитках...</p>',
    description: 'HTML контент для страницы категории (мета-контент)',
    required: false,
  })
  @IsString()
  @IsOptional()
  metaContent?: string; 

  @ApiProperty({
    example: 'напитки, кофе, чай, лимонады',
    description: 'Ключевые слова для SEO',
    required: false,
  })
  @IsString()
  @IsOptional()
  metaKeywords?: string;

  @ApiProperty({
    example: 'clk9e9z9z0000qjyz9z9z9z9z',
    description: 'ID родительской категории',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiProperty({
    example: 0,
    description: 'Порядок сортировки в админке',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({
    example: 0,
    description: 'Порядок сортировки на клиентском сайте',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  clientOrder?: number;

  @ApiProperty({
    example: ['restaurant-id-1', 'restaurant-id-2'],
    description: 'ID ресторанов, к которым привязана категория',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  restaurantIds?: string[];
 
  @ApiProperty({
    example: 'clk9e9z9z0000qjyz9z9z9z9a',
    description: 'ID сети, к которой принадлежит категория',
    required: true,
  })
  @IsString({ message: 'ID сети обязательно' })
  @IsNotEmpty({ message: 'ID сети не может быть пустым' })
  networkId: string;

  @ApiProperty({
    example: true,
    description: 'Статус публикации категории',
    required: false,
  })
  @IsOptional()
  published?: boolean;
}