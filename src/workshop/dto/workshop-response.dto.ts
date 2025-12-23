import { ApiProperty } from '@nestjs/swagger';

export class WorkshopResponseDto {
  @ApiProperty({ description: 'ID цеха' })
  id: string;

  @ApiProperty({ description: 'Название цеха' })
  name: string;

  @ApiProperty({ 
    description: 'ID сети',
    nullable: true,
    required: false 
  })
  networkId?: string | null;

  @ApiProperty({ 
    description: 'Массив ID ресторанов',
    type: [String]
  })
  restaurantIds: string[];

  @ApiProperty({ 
    description: 'Массив ID пользователей',
    type: [String]
  })
  userIds: string[];

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiProperty({ 
    description: 'Информация о сети',
    nullable: true,
    required: false 
  })
  network?: {
    id: string;
    name: string;
  };
}