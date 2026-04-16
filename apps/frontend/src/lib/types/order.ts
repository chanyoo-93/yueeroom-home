import type { Address } from './user';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'kakaopay' | 'naverpay' | 'card';

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  variant?: {
    id: string;
    size: string;
    color: string;
    sku: string;
    product?: {
      id: string;
      name: string;
      images: { url: string }[];
    };
  };
}

export interface Order {
  id: string;
  userId: string;
  addressId: string;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address?: Address;
}

export interface CreateOrderItemDto {
  variantId: string;
  quantity: number;
}

export interface CreateOrderDto {
  addressId: string;
  items: CreateOrderItemDto[];
}
