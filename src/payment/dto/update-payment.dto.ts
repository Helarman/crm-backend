import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator';


export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
  YANDEX = 'YANDEX'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export class UpdatePaymentDto {
  @ApiProperty({ 
    required: false, 
    description: 'Статус платежа',
    enum: PaymentStatus,
    enumName: 'PaymentStatus'
  })
  @IsOptional()
  @IsIn(Object.values(PaymentStatus))
  status?: PaymentStatus;

  @ApiProperty({ required: false, description: 'ID транзакции' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ required: false, description: 'Сумма платежа' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Метод оплаты',
    enum: PaymentMethod,
    enumName: 'PaymentMethod'
  })
  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  method?: PaymentMethod;
}
