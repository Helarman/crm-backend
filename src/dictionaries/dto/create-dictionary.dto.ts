import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateDictionaryDto {
  @ApiProperty({ description: 'Наименование справочника' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Активен ли элемент', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}