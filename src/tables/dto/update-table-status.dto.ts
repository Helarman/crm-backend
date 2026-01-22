import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TableStatus } from '../entities/table.entity';

export class UpdateTableStatusDto {
  @ApiProperty({ 
    description: 'Статус стола',
    enum: TableStatus,
    required: true 
  })
  @IsEnum(TableStatus)
  status: TableStatus;

  @ApiProperty({ 
    description: 'ID заказа (если стол занят)',
    required: false 
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ 
    description: 'Причина изменения статуса',
    required: false 
  })
  @IsOptional()
  @IsString()
  reason?: string;
}