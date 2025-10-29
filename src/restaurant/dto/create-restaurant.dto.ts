import { ArrayMinSize, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({
    type: String,
    example: 'Ресторан "Вкус Востока"',
    description: 'Название ресторана',
    required: true,
  })
  @IsString({ message: 'Название обязательно' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  title: string;

  @ApiProperty({
    type: String,
    example: 'Описание ресторана'
  })
  description: string;

  @ApiProperty({
    type: String,
    example: 'ул. Гурзуфская, 15',
    description: 'Физический адрес ресторана',
    required: true,
  })
  @IsString({ message: 'Адрес обязателен' })
  @IsNotEmpty({ message: 'Адрес не может быть пустым' })
  address: string;

  @ApiProperty({
    type: [String],
    example: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg'
    ],
    description: 'Массив URL-адресов фотографий ресторана',
    minItems: 1,
    required: true,
  })
  @ArrayMinSize(1, { message: 'Должна быть хотя бы одна картинка' })
  @IsNotEmpty({ 
    each: true, 
    message: 'Путь к картинке не может быть пустым' 
  })
  images: string[];

  @IsOptional()
  @IsString()
  legalInfo?: string;
  
  @ApiProperty({
    type: String,
    example: '55.752023',
    description: 'Географическая широта местоположения',
    required: true,
    pattern: '^-?\\d{1,3}\\.\\d{1,6}$'
  })
  @IsString({ message: 'Координаты обязательны' })
  @IsNotEmpty({ message: 'Широта не может быть пустой' })
  latitude: string;

  @ApiProperty({
    type: String,
    example: '37.617499',
    description: 'Географическая долгота местоположения',
    required: true,
    pattern: '^-?\\d{1,3}\\.\\d{1,6}$'
  })
  @IsString({ message: 'Координаты обязательны' })
  @IsNotEmpty({ message: 'Долгота не может быть пустой' })
  longitude: string;
  
  @ApiProperty()
  @IsNotEmpty()
  networkId: string;

  @ApiProperty({ 
    description: 'Использовать складскую систему', 
    required: false,
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  useWarehouse?: boolean;
}