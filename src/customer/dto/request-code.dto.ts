import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString } from 'class-validator';

export class RequestCodeDto {
  @ApiProperty({ 
    description: 'Номер телефона клиента',
    example: '79991234567'
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ 
    description: 'ID сети',
    example: 'clxyz123...'
  })
  @IsString()
  networkId: string;
}