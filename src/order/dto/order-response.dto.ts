import { EnumOrderStatus, EnumPaymentStatus, EnumPaymentMethod, EnumOrderType } from '@prisma/client';

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
  discountAmount: number;
  bonusPointsUsed: number;
  phone?: string
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    bonusPoints?: number;
    personalDiscount?: number;
  };
  discountInfo?: {
    appliedDiscounts: Array<{
      id: string;
      title: string;
      amount: number;
      type: 'PERCENTAGE' | 'FIXED';
    }>;
    totalDiscount: number;
  };
  bonusInfo?: {
    pointsUsed: number;
    pointsValue: number; // в рублях
  };
  restaurant: {
    id: string;
    name: string;
    address: string;
    legalInfo?: string;
    network?: {
      id: string;
      name: string;
      tenant?: {
        domain?: string;
        subdomain?: string;
      };
    };
  };
  restaurantId: string;
  items: Array<{
    id: string;
    status: string;
    isReordered: boolean;
    isRefund: boolean;
    refundReason?: string;
    timestamps?: {
      createdAt: Date;
      startedAt?: Date;
      completedAt?: Date;
      pausedAt?: Date;
      refundedAt?: Date;
    };
    startedBy?: { id: string; name: string };
    completedBy?: { id: string; name: string };
    pausedBy?: { id: string; name: string };
    refundedBy?: { id: string; name: string };
    assignedTo?: {
      id: string;
      name: string;
    } | null;
    product: {
      id: string;
      title: string;
      price: number;
      printLabels;
      image?: string;
      composition?: string;
      workshops: Array<{
        id: string;
        name: string;
      }>;
      ingredients: Array<{
        id: string;
        name: string;
      }>;
      restaurantPrices: Array<{
        price: number;
        isStopList: boolean;
      }>;
    };
    quantity: number;
    comment?: string;
    additives: Array<{
      id: string;
      title: string;
      price: number;
    }>;
    totalPrice: number;
  }>;
  numberOfPeople?: string;
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
    startedAt?: Date;       
    courier?: { 
      id: string;
      name: string;
    };
  };
  totalPrice: number;
  totalAmount: number;
  totalItems: number;
  surcharges?: Array<{
    id: string;
    surchargeId: string;
    title: string;
    amount: number;
    type: 'FIXED' | 'PERCENTAGE';
    description?: string;
  }>;
  attentionFlags: {
    isReordered: boolean;
    hasDiscount: boolean;
    discountCanceled: boolean;
    isPrecheck: boolean;
    isRefund: boolean;
  };
  restaurnat?: any
}