
import { ApiProperty } from '@nestjs/swagger';

export class AutoCloseTimeResponseDto {
  @ApiProperty({ description: 'ID смены' })
  shiftId: string;

  @ApiProperty({ description: 'Название ресторана' })
  restaurant: string;

  @ApiProperty({ description: 'Время начала смены' })
  startTime: Date;

  @ApiProperty({ description: 'Время автоматического закрытия смены' })
  autoCloseTime: Date;

  @ApiProperty({ description: 'Время закрытия ресторана' })
  restaurantCloseTime: Date;
}