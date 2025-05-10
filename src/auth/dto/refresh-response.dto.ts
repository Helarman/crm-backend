import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({ description: 'Новый access token' })
  accessToken: string;

  @ApiProperty({ description: 'Новый refresh token (только для сервера)' })
  refreshToken?: string;
}