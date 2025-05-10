import { Additive, Product } from '@prisma/client';

export interface AdditiveWithProducts extends Additive {
  products?: Product[];
}