import { EnumOrderStatus, EnumPaymentStatus, EnumPaymentMethod, EnumOrderType, OrderAdditiveType } from '@prisma/client';

// Интерфейс для элемента комбо в продукте
export interface ComboItemResponse {
  id: string;
  type: string;
  groupName: string;
  minSelect: number;
  maxSelect: number;
  products: Array<{
    id: string;
    title: string;
    price: number;
    image?: string;
    quantity: number;
    additionalPrice: number;
    allowMultiple: boolean;
    maxQuantity: number;
  }>;
}

// Интерфейс для информации о комбо в продукте
export interface ComboInfoResponse {
  isCombo: boolean;
  comboItems: ComboItemResponse[];
}

// Интерфейс для дочернего элемента комбо
export interface ComboChildItemResponse extends OrderItemResponse {
  isComboChild: boolean;
  parentComboId: string;
}

// Интерфейс для родительского элемента комбо
export interface ComboParentItemResponse extends OrderItemResponse {
  isComboParent: boolean;
  childItems: ComboChildItemResponse[];
  childItemsCount: number;
  childItemsTotalPrice: number;
}

// Интерфейс продукта в элементе заказа
export interface OrderItemProductResponse {
  id: string;
  title: string;
  price: number;
  image?: string;
  workshops: any[];
  ingredients: any[];
  restaurantPrices: Array<{
    price: number;
    isStopList: boolean;
  }>;
  composition?: string;
  printLabels?: boolean;
  isCombo: boolean;
  comboInfo?: ComboInfoResponse | null;
}

// Интерфейс элемента заказа
export interface OrderItemResponse {
  id: string;
  status: string;
  isReordered: boolean;
  isRefund: boolean;
  refundReason?: string;
   parentOrderItemId?: string | null;
  parentComboId?: string | null;
  timestamps?: {
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    pausedAt?: Date;
    refundedAt?: Date;
  };
  startedBy?: { id: string; name: string } | null;
  completedBy?: { id: string; name: string } | null;
  pausedBy?: { id: string; name: string } | null;
  refundedBy?: { id: string; name: string } | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  product: OrderItemProductResponse;
  quantity: number;
  comment?: string;
  additives: Array<{
    id: string;
    title: string;
    price: number;
  }>;
  totalPrice: number;
}

// Интерфейс для статистики по комбо
export interface ComboStatsResponse {
  totalCombos: number;
  totalComboItems: number;
  combos: Array<{
    id: string;
    title: string;
    quantity: number;
    childItemsCount: number;
  }>;
}

// Интерфейс для информации о комбо в заказе
export interface ComboInfoInOrderResponse {
  stats: ComboStatsResponse;
  items: ComboParentItemResponse[];
}

// Интерфейс для модификатора заказа
export interface OrderAdditiveResponse {
  id: string;
  orderAdditiveId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  createdAt: Date;
  orderAdditive: {
    id: string;
    title: string;
    description?: string;
    type: OrderAdditiveType;
    network?: any;
    inventoryItem?: any;
  };
}

// Интерфейс для информации о скидке
export interface DiscountInfoResponse {
  appliedDiscounts: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'PERCENTAGE' | 'FIXED';
  }>;
  totalDiscount: number;
}

// Интерфейс для информации о бонусах
export interface BonusInfoResponse {
  pointsUsed: number;
  pointsValue: number;
}

// Интерфейс для информации о столе
export interface TableInfoResponse {
  id: string;
  name: string;
  seats: number;
  status: string;
  hall?: {
    id: string;
    title: string;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

// Интерфейс для информации о клиенте
export interface CustomerInfoResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

// Интерфейс для информации о ресторане
export interface RestaurantInfoResponse {
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
}

// Интерфейс для информации о платеже
export interface PaymentInfoResponse {
  id: string;
  method: EnumPaymentMethod;
  amount: number;
  status: EnumPaymentStatus;
  externalId?: string;
}

// Интерфейс для надбавки
export interface SurchargeResponse {
  id: string;
  surchargeId: string;
  title: string;
  amount: number;
  type: 'FIXED' | 'PERCENTAGE';
  description?: string;
}

// Интерфейс для флагов внимания
export interface AttentionFlagsResponse {
  isReordered: boolean;
  hasDiscount: boolean;
  discountCanceled: boolean;
  isPrecheck: boolean;
  isRefund: boolean;
}

// Интерфейс для информации о курьере
export interface CourierInfoResponse {
  id: string;
  name: string;
}

// Интерфейс для информации о смене
export interface ShiftInfoResponse {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: string;
}

// Основной интерфейс ответа заказа
export class OrderResponse {
  // Основная информация
  id: string;
  number: string; // Исправлено с number на string, так как в сервисе используется строка
  status: EnumOrderStatus;
  source?: string;
  type: EnumOrderType;
  
  // Даты
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  
  // Информация о клиенте
  customer?: CustomerInfoResponse;
  customerName?: string;
  phone?: string;
  
  // Информация о ресторане
  restaurantId: string;
  restaurant: RestaurantInfoResponse;
  
  // Информация о заказе
  items: OrderItemResponse[];
  numberOfPeople?: string;
  comment?: string;
  tableNumber?: string;
  table?: TableInfoResponse | null;
  
  // Финансовая информация
  totalPrice: number;
  totalAmount: number;
  totalItems: number;
  discountAmount: number;
  bonusPointsUsed: number;
  
  // Платеж
  payment?: PaymentInfoResponse;
  
  // Надбавки
  surcharges?: SurchargeResponse[];
  
  // Модификаторы заказа
  orderAdditives?: OrderAdditiveResponse[];
  
  // Скидки и бонусы
  discountInfo?: DiscountInfoResponse;
  bonusInfo?: BonusInfoResponse;
  personalDiscount?: any;
  
  // Флаги внимания
  attentionFlags: AttentionFlagsResponse;
  
  // Информация о доставке
  deliveryAddress?: string;
  deliveryTime?: Date;
  deliveryNotes?: string;
  deliveryEntrance?: string;
  deliveryIntercom?: string;
  deliveryFloor?: string;
  deliveryApartment?: string;
  deliveryCourierComment?: string;
  deliveryCourier?: CourierInfoResponse;
  deliveryStartedAt?: Date;
  
  // Информация о смене
  shift?: ShiftInfoResponse;
  
  // Информация о комбо (НОВОЕ)
  comboInfo?: ComboInfoInOrderResponse;
  
  // Для обратной совместимости (опционально)
  restaurnat?: any; // Опечатка, оставлена для совместимости
}