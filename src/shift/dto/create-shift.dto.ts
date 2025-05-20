import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { EnumShiftStatus } from '@prisma/client';

export class CreateShiftDto {
  @ApiProperty({ description: 'ID ресторана', example: 'clnjak7xj000008jk5q1q3b2m' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ description: 'Время начала смены', example: '2023-01-01T09:00:00Z' })
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({ description: 'Время окончания смены', required: false, example: '2023-01-01T17:00:00Z' })
  @IsOptional()
  endTime?: Date;

  @ApiProperty({ description: 'Описание смены', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  status: any
}