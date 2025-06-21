import { ApiProperty } from '@nestjs/swagger';

export class OrderLogResponseDto {
  @ApiProperty({ description: 'ID лога' })
  id: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID пользователя', required: false })
  userId?: string;

  @ApiProperty({ description: 'Действие' })
  action: string;
  
  
  @ApiProperty({ description: 'Имя пользователя ' })
  userName: string;

  @ApiProperty({ description: 'Сообщение' })
  message: string;

  @ApiProperty({ description: 'Метаданные', required: false })
  metadata?: any;
}