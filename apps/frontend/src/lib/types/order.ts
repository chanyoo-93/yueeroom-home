import type { Address } from './user';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'kakaopay' | 'naverpay' | 'card';

export interface Payment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  paymentMethod: string;
  paymentKey: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrdersResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  carrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address?: Address;
  payment?: Payment;
}

export interface CreateOrderItemDto {
  variantId: string;
  quantity: number;
}

export interface CreateOrderDto {
  addressId: string;
  items: CreateOrderItemDto[];
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '주문 접수',
  PAID: '결제 완료',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불됨',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  SHIPPING: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-red-100 text-red-600',
};
