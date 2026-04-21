import apiClient from './client';
import type {
  AdminUser,
  AdminOrder,
  PaginatedAdminOrdersResponse,
  UserStatus,
} from '../types/admin';
import type { OrderStatus } from '../types/order';

export async function getAdminUsers(status?: UserStatus): Promise<AdminUser[]> {
  const params = status ? { status } : {};
  const res = await apiClient.get<AdminUser[]>('/admin/users', { params });
  return res.data;
}

export async function approveUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/approve`);
  return res.data;
}

export async function rejectUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/reject`, { reason: '' });
  return res.data;
}

export async function suspendUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/suspend`);
  return res.data;
}

export async function restoreUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/admin/users/${userId}/restore`);
  return res.data;
}

export async function getAdminOrders(page = 1, limit = 20): Promise<PaginatedAdminOrdersResponse> {
  const res = await apiClient.get<PaginatedAdminOrdersResponse>('/admin/orders', {
    params: { page, limit },
  });
  return res.data;
}

export async function updateAdminOrderStatus(
  orderId: string,
  data: { status: OrderStatus; carrier?: string; trackingNumber?: string },
): Promise<AdminOrder> {
  const res = await apiClient.patch<AdminOrder>(`/admin/orders/${orderId}/status`, data);
  return res.data;
}

export async function updateAdminOrderTracking(
  orderId: string,
  data: { carrier: string; trackingNumber: string },
): Promise<AdminOrder> {
  const res = await apiClient.patch<AdminOrder>(`/admin/orders/${orderId}/tracking`, data);
  return res.data;
}
