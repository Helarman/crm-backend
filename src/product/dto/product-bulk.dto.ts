import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ProductBulkDeleteDto {
  @ApiProperty({ description: 'Массив ID продуктов для удаления' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}

export class ProductBulkCategoryDto {
  @ApiProperty({ description: 'Массив ID продуктов' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'ID новой категории (null для удаления категории)', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class ProductBulkWorkshopsDto {
  @ApiProperty({ description: 'Массив ID продуктов' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'Массив ID цехов' })
  @IsArray()
  @IsString({ each: true })
  workshopIds: string[];
}

export class ProductBulkAdditivesDto {
  @ApiProperty({ description: 'Массив ID продуктов' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'Массив ID модификаторов', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additiveIds?: string[];
}

export class ProductBulkToggleDto {
  @ApiProperty({ description: 'Массив ID продуктов' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];

  @ApiProperty({ description: 'Включить или отключить опцию' })
  @IsBoolean()
  enable: boolean;
}

export class ProductRestoreDto {
  @ApiProperty({ description: 'Массив ID продуктов для восстановления' })
  @IsArray()
  @IsString({ each: true })
  productIds: string[];
}