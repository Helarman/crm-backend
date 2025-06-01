
import { EnumOrderStatus, EnumPaymentStatus, EnumPaymentMethod, EnumOrderType} from '@prisma/client';

export class OrderResponse {
  source?: string;
  id: string;
  number?: number;
  status: EnumOrderStatus;
  type: EnumOrderType;
  tableNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  comment?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  restaurant: {
    id: string;
    name: string;
    address: string;
  };
  restaurantId: string;
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      price: number;
      image?: string;
      workshops: {
        id: string,
        name: string
      };
    };
    quantity: number;
    comment?: string;
    status: string;
    additives: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  numberOfPeople?: string
  payment?: {
    id: string;
    method: EnumPaymentMethod;
    amount: number;
    status: EnumPaymentStatus;
    externalId?: string;
  };
  delivery?: {
    address: string;
    time?: Date;
    notes?: string;
  };
  totalPrice: number;
  totalAmount: number; 
  totalItems: number;
  surcharges?: {
    id: string;
    surchargeId: string;
    title: string;
    amount: number;
    type: 'FIXED' | 'PERCENTAGE';
    description?: string;
  }[];
}