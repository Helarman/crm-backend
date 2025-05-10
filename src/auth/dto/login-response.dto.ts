import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class LoginResponseDto {
  @ApiProperty({ description: 'Access token для авторизации' })
  accessToken: string;

  @ApiProperty({ description: 'Данные пользователя' })
  user: Omit<User, 'password'>;

  @ApiProperty({ description: 'Refresh token (только для сервера)' })
  refreshToken?: string;
}