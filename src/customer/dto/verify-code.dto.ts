import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ 
    description: 'Номер телефона клиента',
    example: '79991234567'
  })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ 
    description: 'Код подтверждения',
    example: '123456'
  })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({ 
    description: 'ID сети',
    example: 'clxyz123...'
  })
  @IsString()
  networkId: string;
}