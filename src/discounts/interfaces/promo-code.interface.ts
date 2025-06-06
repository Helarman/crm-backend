import { Discount } from '@prisma/client';

export interface PromoCodeWithDiscount {
  id: string;
  code: string;
  customerId: string;
  discountId: string;
  used: boolean;
  createdAt: Date;
  discount: Discount;
}