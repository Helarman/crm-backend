import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRestaurantDto {
  @ApiProperty({ description: 'Название ресторана', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Описание ресторана', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Адрес ресторана', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Изображения ресторана', type: [String], required: false })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ description: 'Широта', required: false })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiProperty({ description: 'Долгота', required: false })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiProperty({ description: 'Юридическая информация', required: false })
  @IsOptional()
  @IsString()
  legalInfo?: string;

  @ApiProperty({ description: 'ID сети ресторанов', required: false })
  @IsOptional()
  @IsString()
  networkId?: string;

  @ApiProperty({ 
    description: 'Использовать складскую систему', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  useWarehouse?: boolean;

  @ApiProperty({
    description: 'Время закрытия смены',
    required: false,
    example: '1970-01-01T23:59:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  shiftCloseTime?: Date;

  // Часы работы по дням недели
  @ApiProperty({ description: 'Время открытия в понедельник', required: false })
  @IsOptional()
  @IsDateString()
  mondayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в понедельник', required: false })
  @IsOptional()
  @IsDateString()
  mondayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли понедельник', required: false })
  @IsOptional()
  @IsBoolean()
  mondayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия во вторник', required: false })
  @IsOptional()
  @IsDateString()
  tuesdayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия во вторник', required: false })
  @IsOptional()
  @IsDateString()
  tuesdayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли вторник', required: false })
  @IsOptional()
  @IsBoolean()
  tuesdayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия в среду', required: false })
  @IsOptional()
  @IsDateString()
  wednesdayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в среду', required: false })
  @IsOptional()
  @IsDateString()
  wednesdayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли среда', required: false })
  @IsOptional()
  @IsBoolean()
  wednesdayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия в четверг', required: false })
  @IsOptional()
  @IsDateString()
  thursdayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в четверг', required: false })
  @IsOptional()
  @IsDateString()
  thursdayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли четверг', required: false })
  @IsOptional()
  @IsBoolean()
  thursdayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия в пятницу', required: false })
  @IsOptional()
  @IsDateString()
  fridayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в пятницу', required: false })
  @IsOptional()
  @IsDateString()
  fridayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли пятница', required: false })
  @IsOptional()
  @IsBoolean()
  fridayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия в субботу', required: false })
  @IsOptional()
  @IsDateString()
  saturdayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в субботу', required: false })
  @IsOptional()
  @IsDateString()
  saturdayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли суббота', required: false })
  @IsOptional()
  @IsBoolean()
  saturdayIsWorking?: boolean;

  @ApiProperty({ description: 'Время открытия в воскресенье', required: false })
  @IsOptional()
  @IsDateString()
  sundayOpen?: Date;

  @ApiProperty({ description: 'Время закрытия в воскресенье', required: false })
  @IsOptional()
  @IsDateString()
  sundayClose?: Date;

  @ApiProperty({ description: 'Рабочий ли воскресенье', required: false })
  @IsOptional()
  @IsBoolean()
  sundayIsWorking?: boolean;

   @ApiProperty({ 
    description: 'Разрешить отрицательный остаток на складе', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiProperty({ 
    description: 'Принимать заказы', 
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  acceptOrders?: boolean;
  
}