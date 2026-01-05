import { OrderAdditive, Network, InventoryItem, Order, OrderOrderAdditive, OrderAdditiveType, EnumOrderType } from '@prisma/client';

export type OrderAdditiveWithRelations = OrderAdditive & {
  network?: Network | null;
  inventoryItem?: InventoryItem | null;
  orders?: (OrderOrderAdditive & { order: Order })[];
};

export type OrderAdditiveWithOrders = OrderAdditive & {
  orders: OrderOrderAdditive[];
};

export type OrderOrderAdditiveWithDetails = OrderOrderAdditive & {
  orderAdditive: OrderAdditive;
};

export interface OrderAdditiveFilter {
  networkId?: string;
  orderType?: EnumOrderType;
  isActive?: boolean;
  type?: OrderAdditiveType;
}