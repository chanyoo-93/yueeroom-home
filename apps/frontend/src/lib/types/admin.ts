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

export interface DailySalesRow {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface MonthlySalesRow {
  month: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductRow {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
}

export interface SalesStatsResponse {
  daily: DailySalesRow[];
  monthly: MonthlySalesRow[];
  topProducts: TopProductRow[];
}

export interface OrderStatsResponse {
  statusBreakdown: Record<string, number>;
  totalOrders: number;
  pendingUsersCount: number;
}
