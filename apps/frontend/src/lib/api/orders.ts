import apiClient from './client';
import type { Order, CreateOrderDto } from '../types/order';

export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  const res = await apiClient.post<Order>('/orders', dto);
  return res.data;
}

export async function getOrders(): Promise<Order[]> {
  const res = await apiClient.get<Order[]>('/orders');
  return res.data;
}

export async function getOrder(orderId: string): Promise<Order> {
  const res = await apiClient.get<Order>(`/orders/${orderId}`);
  return res.data;
}
