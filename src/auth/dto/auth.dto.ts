import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {
  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя пользователя',
    required: false
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Электронная почта',
    required: true
  })
  @IsString({ message: 'Почта обязательна' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'strongpassword123',
    description: 'Пароль (минимум 6 символов)',
    minLength: 6,
    required: true
  })
  @MinLength(6, { message: 'Пароль должен содержать не менее 6 символов!' })
  @IsString({ message: 'Пароль обязателен' })
  password: string;
}