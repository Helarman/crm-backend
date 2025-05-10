import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({
    example: '+79123456789',
    description: 'Номер телефона клиента',
    required: true
  })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'Код подтверждения из SMS',
    required: true
  })
  code: string;
}