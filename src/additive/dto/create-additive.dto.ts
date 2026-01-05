import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateAdditiveDto {
  @ApiProperty({ example: 'Без лука', description: 'Название модификатора' })
  @IsString()
  title: string;

  @ApiProperty({ example: 50, description: 'Цена модификатора' })
  @IsNumber()
  price: number;

  @ApiProperty({ 
    example: 0.5, 
    description: 'Количество ингредиента, списываемое со склада',
    required: false,
    default: 1.0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ingredientQuantity?: number;

  @ApiProperty({ 
    example: 'clf8x2z8s000008l5b4rq8e9a', 
    description: 'ID сети (необязательно)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  networkId?: string;

  @ApiProperty({ 
    example: 'clf8x2z8s000008l5b4rq8e9b', 
    description: 'ID инвентарного товара (необязательно)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  inventoryItemId?: string;
}