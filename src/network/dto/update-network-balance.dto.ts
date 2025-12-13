import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export enum NetworkBalanceOperationType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL'
}

export class UpdateNetworkBalanceDto {
  @ApiProperty({ 
    enum: NetworkBalanceOperationType, 
    description: 'Тип операции: DEPOSIT - пополнение, WITHDRAWAL - списание' 
  })
  @IsEnum(NetworkBalanceOperationType)
  operation: NetworkBalanceOperationType;

  @ApiProperty({ description: 'Сумма операции' })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Причина операции', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'ID пользователя, выполняющего операцию', required: false })
  @IsOptional()
  @IsString()
  performedById?: string;
}