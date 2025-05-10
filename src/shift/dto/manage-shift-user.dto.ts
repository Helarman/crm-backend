import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ManageShiftUserDto {
    @ApiProperty({ description: 'ID пользователя', example: 'clnjak7xj000008jk5q1q3b2m' })
    @IsString()
    @IsNotEmpty()
    userId: string;
  
    @ApiProperty({ description: 'Роль пользователя в смене', required: false })
    @IsOptional()
    @IsString()
    role?: string;
  }