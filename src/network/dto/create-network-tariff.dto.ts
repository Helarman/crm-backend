import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export enum TariffPeriod {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export class CreateNetworkTariffDto {
  @ApiProperty({ description: 'Название тарифа' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Цена тарифа' })
  @IsNumber()
  @IsPositive()
  @Min(0)
  price: number;

  @ApiProperty({ 
    enum: TariffPeriod, 
    default: TariffPeriod.MONTH, 
    description: 'Период действия' 
  })
  @IsEnum(TariffPeriod)
  period: TariffPeriod = TariffPeriod.MONTH;
  

  @ApiProperty({ description: 'Активен ли тариф', default: true })
  @IsBoolean()
  isActive: boolean = true;
}