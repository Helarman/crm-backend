import { ApiProperty } from '@nestjs/swagger';

export class RequestCodeDto {
  @ApiProperty({
    example: '+79123456789',
    description: 'Номер телефона клиента',
    required: true
  })
  phone: string;
}