import apiClient from './client';
import type { Order, CreateOrderDto, PaginatedOrdersResponse } from '../types/order';

export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  const res = await apiClient.post<Order>('/orders', dto);
  return res.data;
}

export async function getOrders(page = 1, limit = 10): Promise<PaginatedOrdersResponse> {
  const res = await apiClient.get<PaginatedOrdersResponse>('/orders', {
    params: { page, limit },
  });
  return res.data;
}

export async function getOrder(orderId: string): Promise<Order> {
  const res = await apiClient.get<Order>(`/orders/${orderId}`);
  return res.data;
}
