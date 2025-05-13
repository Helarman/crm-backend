export class ProductDto {
  title: string;
  description: string; // Обязательное поле в схеме Prisma
  ingredients: string; // Обязательное поле в схеме Prisma
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
  additives?: string[]; // Массив ID добавок
  restaurantPrices?: {
    restaurantId: string;
    price: number;
    isStopList: boolean;
  }[];
}