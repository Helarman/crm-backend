export class ProductDto {
  sortOrder?: number
  title: string;
  description: string; 
  price: number;
  images: string[];
  categoryId?: string;
  weight?: number;
  preparationTime?: number;
  packageQuantity?: number;
  printLabels?: boolean;
  publishedOnWebsite?: boolean;
  publishedInApp?: boolean;
  isStopList?: boolean;
  quantity: number;
  pageTitle?: string;
  workshopIds?: string[];
  metaDescription?: string;
  tableNumber?: string;
  content?: string;
  additives?: string[];  
  clientSortOrder?: number
  restaurantPrices?: {
    restaurantId: string;
    price: number;
    isStopList: boolean;
  }[];
   ingredients?: {
    inventoryItemId: string;
    quantity: number;
  }[];
}