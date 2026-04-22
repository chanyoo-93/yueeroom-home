import apiClient from './client';
import type { SalesStatsResponse, OrderStatsResponse } from '../types/admin';

export async function getAdminSalesStats(): Promise<SalesStatsResponse> {
  const res = await apiClient.get<SalesStatsResponse>('/admin/stats/sales');
  return res.data;
}

export async function getAdminOrderStats(): Promise<OrderStatsResponse> {
  const res = await apiClient.get<OrderStatsResponse>('/admin/stats/orders');
  return res.data;
}
