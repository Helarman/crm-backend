import { ApiProperty } from '@nestjs/swagger';

export class CustomerDto {
  @ApiProperty({ description: 'Уникальный идентификатор клиента' })
  id: string;

  @ApiProperty({ description: 'Номер телефона клиента' })
  phone: string;

  @ApiProperty({ description: 'Дата создания аккаунта', type: Date })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Дата последнего входа', 
    type: Date,
    required: false 
  })
  lastLogin?: Date;
}