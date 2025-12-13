import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnumUserRoles } from '@prisma/client';

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

  role?: EnumUserRoles
}

export class RegisterDto extends AuthDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  name: string

  @IsBoolean()
  @IsNotEmpty({ message: 'Необходимо согласие с условиями' })
  acceptTerms: boolean
}