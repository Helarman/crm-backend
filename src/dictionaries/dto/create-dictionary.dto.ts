import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsInt } from 'class-validator';

export class CreateDictionaryDto {
  @ApiProperty({ description: 'Наименование причины' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Активна ли причина', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'ID ресторана' })
  @IsString()
  restaurantId: string;
}

export class CopyDictionaryDto {
  @ApiProperty({ description: 'ID ресторана-источника' })
  @IsString()
  sourceRestaurantId: string;

  @ApiProperty({ description: 'ID ресторана-назначения' })
  @IsString()
  targetRestaurantId: string;

  @ApiProperty({ description: 'Перезаписывать существующие записи', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;
}