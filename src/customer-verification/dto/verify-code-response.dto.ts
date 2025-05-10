import { ApiProperty } from '@nestjs/swagger';


export class VerifyCodeResponseDto {
    @ApiProperty({ description: 'Флаг валидности кода' })
    isValid: boolean;
  
    @ApiProperty({ description: 'JWT токен доступа' })
    accessToken: string;
  
    @ApiProperty({ description: 'JWT refresh токен' })
    refreshToken: string;
  
    @ApiProperty({ description: 'Информация о клиенте' })
    customer: {
      id: string;
      phone: string;
    };
  }
  