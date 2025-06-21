import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateShiftIncomeDto {
  @ApiProperty({ description: 'Название дохода' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Сумма дохода' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Описание дохода', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateShiftIncomeDto {
  @ApiProperty({ description: 'Название дохода', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Сумма дохода', required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Описание дохода', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}