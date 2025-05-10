import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokensResponseDto {
    @ApiProperty({ description: 'JWT токен доступа' })
    accessToken: string;
  
    @ApiProperty({ description: 'JWT refresh токен' })
    refreshToken: string;
  }