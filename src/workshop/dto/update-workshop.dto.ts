import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateWorkshopDto {
  @ApiProperty({ example: 'Суши-цех', description: 'Новое название цеха', required: false })
  @IsString()
  @IsOptional()
  name?: string;

   @ApiProperty({ 
    example: ['cln8z9p3a000008l49w9z5q1e', 'cln8z9p3b000108l49w9z5q1e'],
    description: 'Массив ID ресторанов',
    required: false
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  restaurantIds?: string[];

  @ApiProperty({ 
    example: ['cln8z9p3a000008l49w9z5q1e', 'cln8z9p3b000108l49w9z5q1e'],
    description: 'Массив ID пользователей',
    required: false
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  userIds?: string[];

}