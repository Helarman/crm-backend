import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsBoolean, 
  IsEnum, 
  IsNumber, 
  IsOptional, 
  IsString, 
  Min, 
  ValidateNested,
  IsInt
} from 'class-validator';

export enum ComboItemType {
  STATIC = 'STATIC',
  CHOICE = 'CHOICE',
  OPTIONAL = 'OPTIONAL'
}

export class OrderComboSelectedProductDto {
  @ApiProperty({ description: 'ID продукта' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Количество' })
  @IsInt()
  @Min(1)
  quantity: number;
}
export class OrderComboSelectionDto {
  @ApiProperty({ description: 'ID элемента комбо' })
  @IsString()
  comboItemId: string;

  @ApiProperty({ type: [OrderComboSelectedProductDto], description: 'Выбранные продукты' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderComboSelectedProductDto)
  selectedProducts: OrderComboSelectedProductDto[];
}

export class ComboItemProductDto {
  @ApiProperty({ description: 'ID продукта' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Количество', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Дополнительная цена', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  additionalPrice?: number;

  @ApiProperty({ description: 'Можно ли выбирать несколько раз', default: false })
  @IsBoolean()
  @IsOptional()
  allowMultiple?: boolean;

  @ApiProperty({ description: 'Максимальное количество (если allowMultiple = true)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxQuantity?: number;

  @ApiProperty({ description: 'Порядок сортировки', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class ComboItemDto {
  @ApiProperty({ description: 'ID элемента (для обновления)', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ enum: ComboItemType, description: 'Тип элемента' })
  @IsEnum(ComboItemType)
  type: ComboItemType;

  @ApiProperty({ description: 'Минимальное количество для выбора (для CHOICE)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  minSelect?: number;

  @ApiProperty({ description: 'Максимальное количество для выбора (для CHOICE)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSelect?: number;

  @ApiProperty({ description: 'Название группы (например: "Выберите соус")', required: false })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiProperty({ description: 'Порядок сортировки', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ type: [ComboItemProductDto], description: 'Продукты в элементе' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemProductDto)
  products: ComboItemProductDto[];
}

export class CreateComboDto {
  @ApiProperty({ description: 'Название комбо' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Описание комбо', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Базовая цена комбо' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ type: [ComboItemDto], description: 'Элементы комбо' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items: ComboItemDto[];

  @ApiProperty({ description: 'ID категории', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'ID сети', required: false })
  @IsOptional()
  @IsString()
  networkId?: string;

  @ApiProperty({ description: 'Изображения', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: 'ID цехов', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workshopIds?: string[];

  @ApiProperty({ description: 'ID добавок', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additives?: string[];
     restaurantPrices?: {
    restaurantId: string;
    price: number;
    isStopList: boolean;
  }[];
  sortOrder?: number
clientSortOrder?: number
}

export class UpdateComboDto {
  @ApiProperty({ description: 'Название комбо', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Описание комбо', required: false })
  @IsOptional()
  @IsString()
  description?: string;
sortOrder?: number
clientSortOrder?: number
  @ApiProperty({ description: 'Базовая цена комбо', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ type: [ComboItemDto], description: 'Элементы комбо', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items?: ComboItemDto[];

  @ApiProperty({ description: 'ID категории', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: 'Изображения', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: 'ID цехов', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workshopIds?: string[];

  @ApiProperty({ description: 'ID добавок', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additives?: string[];

   restaurantPrices?: {
    restaurantId: string;
    price: number;
    isStopList: boolean;
  }[];
}

// DTO для заказа комбо
export class OrderComboItemDto {
  @ApiProperty({ description: 'ID комбо' })
  @IsString()
  comboId: string;

  @ApiProperty({ type: [OrderComboSelectionDto], description: 'Выбранные продукты' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderComboSelectionDto)
  selections: OrderComboSelectionDto[];
}


// DTO для расчета цены комбо
export class CalculateComboPriceDto {
  @ApiProperty({ description: 'ID комбо' })
  @IsString()
  comboId: string;

  @ApiProperty({ type: [OrderComboSelectionDto], description: 'Выбранные продукты' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderComboSelectionDto)
  selections: OrderComboSelectionDto[];
}

export class ComboPriceCalculation {
  basePrice: number;
  additionalPrice: number;
  totalPrice: number;
  breakdown: {
    itemId: string;
    itemName: string;
    selectedProducts: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }[];
  }[];
}