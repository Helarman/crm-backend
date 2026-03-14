// dto/add-item-to-order.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, Min, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddItemToOrderDto {
  @ApiProperty({ description: 'ID продукта' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Количество', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
@ApiProperty({ description: 'Цена (если не указана, используется стандартная)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
  
  @ApiProperty({ description: 'ID модификаторов', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additiveIds?: string[];

  @ApiProperty({ description: 'Комментарий к позиции', required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ description: 'ID родительского комбо (если позиция входит в комбо)', required: false })
  @IsOptional()
  @IsString()
  parentComboId?: string;
    @ApiProperty({ description: 'ID родительского OrderItem (если позиция входит в комбо)', required: false })
  @IsOptional()
  @IsString()
  @ValidateIf(o => o.parentComboId !== undefined)
  parentOrderItemId?: string;
}