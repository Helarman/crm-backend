import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, IsBoolean, IsEnum } from 'class-validator';
import { EnumUserRoles } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'Имя пользователя' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false, description: 'Email пользователя' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Телефон пользователя' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'Роль пользователя', enum: EnumUserRoles })
  @IsOptional()
  @IsEnum(EnumUserRoles)
  role?: EnumUserRoles;

  @ApiProperty({ required: false, description: 'Заблокирован ли пользователь' })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiProperty({ required: false, description: 'Аватар пользователя' })
  @IsOptional()
  @IsString()
  picture?: string;
}