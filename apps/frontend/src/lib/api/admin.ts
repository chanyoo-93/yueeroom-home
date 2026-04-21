import apiClient from './client';
import type { AdminUser, UserStatus } from '../types/admin';

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
