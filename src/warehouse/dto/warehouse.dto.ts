import { ApiProperty } from '@nestjs/swagger';
import {
  Warehouse,
  StorageLocation,
  InventoryItem,
  WarehouseItem,
  InventoryTransaction,
  InventoryTransactionType,
  Premix,
  PremixIngredient,
  ProductIngredient,
} from '@prisma/client';

export class WarehouseDto implements Partial<Warehouse> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  restaurantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateWarehouseDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;


  @ApiProperty()
  restaurantId?: string;

  initialInventory?: {
    inventoryItemId: string;
    quantity?: number;
    minQuantity?: number;
    storageLocationId?: string;
  }[];

}

export class UpdateWarehouseDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;
}

export class StorageLocationDto implements Partial<StorageLocation> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateStorageLocationDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class UpdateStorageLocationDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;
}

export class InventoryItemDto implements Partial<InventoryItem> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  productId?: string;

  @ApiProperty({ required: false })
  premixId?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateInventoryItemDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  categoryId?: string; 
  
  @ApiProperty({ required: false })
  productId?: string;
  addToWarehouseId?: string;
  initialQuantity?: number;

}

export class UpdateInventoryItemDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  productId?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;
}

export class WarehouseItemDto implements Partial<WarehouseItem> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty({ required: false })
  storageLocationId?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  reserved: number;

  @ApiProperty({ required: false })
  minQuantity?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateWarehouseItemDto {
  @ApiProperty()
  warehouseId: string; 
  
  @ApiProperty()
  inventoryItemId: string;
  
  @ApiProperty({ required: false })
  storageLocationId?: string;
  
  @ApiProperty()
  quantity: number;
  
  @ApiProperty({ required: false })
  minQuantity?: number;

  @ApiProperty({ required: false })
  cost?: number;

}

export class UpdateWarehouseItemDto {
  @ApiProperty({ required: false })
  storageLocationId?: string;

  @ApiProperty({ required: false })
  quantity?: number;

  @ApiProperty({ required: false })
  reserved?: number;

  @ApiProperty({ required: false })
  minQuantity?: number;

  @ApiProperty({ required: false })
  cost?: number; 

}

export class InventoryTransactionDto implements Partial<InventoryTransaction> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ enum: InventoryTransactionType })
  type: InventoryTransactionType;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  unitCost?: number;

  @ApiProperty({ required: false })
  totalCost?: number;
  
  @ApiProperty()
  previousQuantity: number;

  @ApiProperty()
  newQuantity: number;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  documentId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PremixDto {
  id: string;
  name: string;
  description?: string;
  unit: string;
  yield: number;
  createdAt: Date;
  updatedAt: Date;
  
  ingredients: PremixIngredientDto[];
  inventoryItem?: InventoryItemDto;
  
  warehouseItem?: WarehouseItemDto;
}
  export class WarehousePremixDto extends PremixDto {
  warehouseItem?: WarehouseItemDto;
  availableQuantity: number;
}

export class CreatePremixDto {
  name: string;
  description?: string;
  unit: string;
  yield?: number;
  ingredients: AddPremixIngredientDto[];
}

export class UpdatePremixDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  yield?: number;
}

export class PremixIngredientDto implements Partial<PremixIngredient> {
  @ApiProperty()
  premixId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  quantity: number;
}

export class AddPremixIngredientDto {
  inventoryItemId: string;
  quantity: number;
}

export class ProductIngredientDto implements Partial<ProductIngredient> {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  quantity: number;
}

export class AddProductIngredientDto {
  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  quantity: number;
}

export class InventoryAvailabilityDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  allAvailable: boolean;

  @ApiProperty()
  ingredients: {
    ingredientId: string;
    ingredientName: string;
    required: number;
    available: number;
    isAvailable: boolean;
  }[];
}

export class BulkCreateWarehouseItemsDto {
  @ApiProperty({ description: 'ID ресторана' })
  restaurantId: string;

  @ApiProperty({ 
    description: 'ID склада (опционально, если не указан - будет использован склад ресторана)',
    required: false 
  })
  warehouseId?: string;

  @ApiProperty({ 
    description: 'Количество по умолчанию для всех товаров',
    required: false,
    default: 0 
  })
  defaultQuantity?: number;

  @ApiProperty({ 
    description: 'Минимальное количество по умолчанию',
    required: false 
  })
  defaultMinQuantity?: number;

  @ApiProperty({ 
    description: 'ID места хранения по умолчанию',
    required: false 
  })
  defaultStorageLocationId?: string;

  @ApiProperty({ 
    description: 'Список конкретных inventoryItem IDs для создания (опционально)',
    required: false,
    type: [String] 
  })
  specificItemIds?: string[];

  @ApiProperty({ 
    description: 'Пропускать уже существующие товары на складе',
    required: false,
    default: true 
  })
  skipExisting?: boolean;
}


export class AddMissingItemsDto {
  @ApiProperty({ description: 'ID склада' })
  warehouseId: string;

  @ApiProperty({ 
    description: 'Количество по умолчанию для добавляемых товаров',
    required: false,
    default: 0 
  })
  defaultQuantity?: number;

  @ApiProperty({ 
    description: 'Минимальное количество по умолчанию',
    required: false 
  })
  defaultMinQuantity?: number;

  @ApiProperty({ 
    description: 'ID места хранения по умолчанию',
    required: false 
  })
  defaultStorageLocationId?: string;

  @ApiProperty({ 
    description: 'Игнорировать ошибки для отдельных товаров и продолжать',
    required: false,
    default: false 
  })
  ignoreErrors?: boolean;
}

export class CreateInventoryTransactionDto {
  @ApiProperty()
  inventoryItemId: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty({ required: false })
  warehouseItemId?: string;

  @ApiProperty({ required: false })
  targetWarehouseId?: string;

  @ApiProperty({ required: false })
  unitCost?: number;

  @ApiProperty({ enum: InventoryTransactionType })
  type: InventoryTransactionType;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ required: false })
  reason?: string;

  @ApiProperty({ required: false })
  documentId?: string;
}

export class InventoryCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ type: [InventoryCategoryDto], required: false })
  children?: InventoryCategoryDto[];

  @ApiProperty({ type: [InventoryItemDto], required: false })
  inventoryItems?: InventoryItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateInventoryCategoryDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false, default: true })
  isActive?: boolean;
}

export class UpdateInventoryCategoryDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty({ required: false })
  icon?: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;
}