import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AssignOrderToTableDto {
  @ApiProperty({ description: 'ID заказа' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ 
    description: 'Автоматически обновить статус на "ЗАНЯТ"',
    required: false,
    default: true 
  })
  autoSetOccupied?: boolean = true;
}