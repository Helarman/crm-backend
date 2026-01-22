import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CombineTablesDto {
  @ApiProperty({ description: 'ID основного стола' })
  @IsString()
  @IsNotEmpty()
  mainTableId: string;

  @ApiProperty({ description: 'ID столов для объединения' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  tableIds: string[];

  @ApiPropertyOptional({ description: 'Название объединенного стола' })
  @IsString()
  @IsOptional()
  combinedTableName?: string;

  @ApiPropertyOptional({ 
    description: 'Сохранить оригинальные столы как неактивные',
    default: false 
  })
  @IsBoolean()
  @IsOptional()
  keepOriginalTables?: boolean;
}