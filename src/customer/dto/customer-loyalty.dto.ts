import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max, IsPositive } from 'class-validator';

export class SetPersonalDiscountDto {
  @ApiProperty({ description: 'Размер скидки (0-100%)', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  discount: number;
}

export class EarnBonusPointsDto {
  @ApiProperty({ description: 'Количество бонусов для начисления', example: 100 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'ID заказа (опционально)', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Описание транзакции', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SpendBonusPointsDto {
  @ApiProperty({ description: 'Количество бонусов для списания', example: 50 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'ID заказа (опционально)', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Описание транзакции', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AdjustBonusBalanceDto {
  @ApiProperty({ description: 'Сумма корректировки (может быть отрицательной)', example: -50 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Причина корректировки', example: 'Корректировка по заявке клиента' })
  @IsString()
  reason: string;
}