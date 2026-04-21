import type { OrderStatus } from './order';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  shippingFee: number;
  carrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface PaginatedAdminOrdersResponse {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
