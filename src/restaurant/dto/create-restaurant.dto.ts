import { ArrayMinSize, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
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

  @ApiProperty({
    type: String,
    example: '1970-01-01T23:59:00.000Z',
    description: 'Время закрытия смены по умолчанию',
    required: false,
    default: '1970-01-01T23:59:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  shiftCloseTime?: Date;

  // Часы работы по дням недели
  @ApiProperty({
    description: 'Время открытия в понедельник',
    required: false,
    example: '1970-01-01T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  mondayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в понедельник',
    required: false,
    example: '1970-01-01T18:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  mondayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли понедельник',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  mondayIsWorking?: boolean;

  // Вторник
  @ApiProperty({
    description: 'Время открытия во вторник',
    required: false,
    example: '1970-01-01T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  tuesdayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия во вторник',
    required: false,
    example: '1970-01-01T18:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  tuesdayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли вторник',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  tuesdayIsWorking?: boolean;

  // Среда
  @ApiProperty({
    description: 'Время открытия в среду',
    required: false,
    example: '1970-01-01T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  wednesdayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в среду',
    required: false,
    example: '1970-01-01T18:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  wednesdayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли среда',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  wednesdayIsWorking?: boolean;

  // Четверг
  @ApiProperty({
    description: 'Время открытия в четверг',
    required: false,
    example: '1970-01-01T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  thursdayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в четверг',
    required: false,
    example: '1970-01-01T18:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  thursdayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли четверг',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  thursdayIsWorking?: boolean;

  // Пятница
  @ApiProperty({
    description: 'Время открытия в пятницу',
    required: false,
    example: '1970-01-01T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  fridayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в пятницу',
    required: false,
    example: '1970-01-01T18:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  fridayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли пятница',
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  fridayIsWorking?: boolean;

  // Суббота
  @ApiProperty({
    description: 'Время открытия в субботу',
    required: false,
    example: '1970-01-01T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  saturdayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в субботу',
    required: false,
    example: '1970-01-01T16:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  saturdayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли суббота',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  saturdayIsWorking?: boolean;

  // Воскресенье
  @ApiProperty({
    description: 'Время открытия в воскресенье',
    required: false,
    example: '1970-01-01T10:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  sundayOpen?: Date;

  @ApiProperty({
    description: 'Время закрытия в воскресенье',
    required: false,
    example: '1970-01-01T16:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  sundayClose?: Date;

  @ApiProperty({
    description: 'Рабочий ли воскресенье',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  sundayIsWorking?: boolean;
}