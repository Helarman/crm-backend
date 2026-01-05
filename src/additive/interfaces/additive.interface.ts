import { Product, Network, InventoryItem } from '@prisma/client';

export interface AdditiveWithRelations {
  id: string;
  title: string;
  price: number;
  ingredientQuantity: number | null; 
  createdAt: Date;
  updatedAt: Date;
  networkId?: string | null;
  inventoryItemId?: string | null;
  
  // Relations
  products?: Product[];
  network?: Network | null;
  inventoryItem?: InventoryItem | null;
}

// Альтернативное имя для обратной совместимости
export type AdditiveWithProducts = AdditiveWithRelations;