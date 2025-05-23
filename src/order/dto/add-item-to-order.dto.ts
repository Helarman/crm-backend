export class AddItemToOrderDto {
productId: string;
  quantity: number;
  additiveIds?: string[];
  comment?: string;
}