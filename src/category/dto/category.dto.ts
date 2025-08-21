import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
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
  @ApiProperty({
    example: 'napitki',
    description: 'ЧПУ-ссылка категории',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
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
  })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    example: 0,
    description: 'Порядок сортировки',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  order?: number;
}