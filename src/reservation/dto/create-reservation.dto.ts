import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsPhoneNumber, IsNumber, Min, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReservationSource {
  PANEL = 'PANEL',
  WEBSITE = 'WEBSITE',
  MOBILE_APP = 'MOBILE_APP',
  YANDEX_FOOD = 'YANDEX_FOOD',
}

export class CreateReservationDto {
  @ApiProperty({ description: 'ID стола' })
  @IsNotEmpty()
  @IsString()
  tableId: string;

  @ApiProperty({ description: 'Номер телефона клиента' })
  @IsNotEmpty()
  @IsPhoneNumber('RU')
  phone: string;

  @ApiProperty({ description: 'Имя клиента' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Дата и время бронирования', example: '2024-01-15T19:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  reservationTime: string;

  @ApiProperty({ description: 'Количество человек', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  numberOfPeople: number;

  @ApiProperty({ description: 'Комментарий к бронированию', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Источник бронирования', enum: ReservationSource, default: ReservationSource.PANEL })
  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @ApiProperty({ description: 'Email клиента', required: false })
  @IsOptional()
  @IsString()
  email?: string;
}