import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsOptional, Min, IsPositive } from 'class-validator';

export enum NetworkTransactionTypeDto {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

export class CreateNetworkTransactionDto {
  @ApiProperty({ enum: NetworkTransactionTypeDto, description: 'Тип транзакции' })
  @IsEnum(NetworkTransactionTypeDto)
  type: NetworkTransactionTypeDto;

  @ApiProperty({ description: 'Сумма транзакции' })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Описание транзакции', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID пользователя, создавшего транзакцию', required: false })
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiProperty({ description: 'Тип связанного объекта', required: false })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({ description: 'ID связанного объекта', required: false })
  @IsOptional()
  @IsString()
  referenceId?: string;
}