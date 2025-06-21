import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderLogDto {
  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID пользователя (опционально)' })
  userId?: string;

  @ApiProperty({ description: 'Действие (например, "status_change")' })
  action: string;

  @ApiProperty({ description: 'Сообщение лога' })
  message: string;

  @ApiProperty({ 
    description: 'Дополнительные метаданные в формате JSON',
    required: false 
  })
  metadata?: any;
}