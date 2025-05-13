import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateWorkshopDto {
  @ApiProperty({ example: 'Суши-цех', description: 'Новое название цеха', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}