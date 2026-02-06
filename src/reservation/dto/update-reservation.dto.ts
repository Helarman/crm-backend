import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @ApiProperty({ description: 'Дата и время бронирования', required: false })
  @IsOptional()
  @IsDateString()
  reservationTime?: string;

  @ApiProperty({ description: 'Количество человек', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfPeople?: number;

  @ApiProperty({ description: 'Комментарий к бронированию', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'Статус бронирования', enum: ReservationStatus, required: false })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiProperty({ description: 'Время прибытия клиента', required: false })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiProperty({ description: 'Время отмены брони', required: false })
  @IsOptional()
  @IsDateString()
  cancellationTime?: any;
}