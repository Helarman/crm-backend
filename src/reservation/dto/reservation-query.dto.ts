import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationQueryDto {
  @ApiProperty({ description: 'ID ресторана', required: false })
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiProperty({ description: 'ID зала', required: false })
  @IsOptional()
  @IsString()
  hallId?: string;

  @ApiProperty({ description: 'ID стола', required: false })
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiProperty({ description: 'Статус бронирования', enum: ReservationStatus, required: false })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiProperty({ description: 'Дата начала периода', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Дата окончания периода', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Номер телефона клиента', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Только активные брони', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyActive?: boolean = false;

  @ApiProperty({ description: 'Номер страницы', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Лимит на странице', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}