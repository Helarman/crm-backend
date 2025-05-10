import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ManageShiftOrderDto {
    @ApiProperty({ description: 'ID заказа', example: 'clnjak7xj000008jk5q1q3b2m' })
    @IsString()
    @IsNotEmpty()
    orderId: string;
  }