import apiClient from './client';
import type { InventoryItem } from '../types/inventory';

export async function adminGetInventories(): Promise<InventoryItem[]> {
  const res = await apiClient.get<InventoryItem[]>('/inventory');
  return res.data;
}

export async function adminUpdateInventoryQuantity(
  variantId: string,
  quantity: number,
): Promise<InventoryItem> {
  const res = await apiClient.patch<InventoryItem>(`/inventory/${variantId}`, { quantity });
  return res.data;
}

export async function adminUpdateInventoryThreshold(
  variantId: string,
  lowStockThreshold: number,
): Promise<InventoryItem> {
  const res = await apiClient.patch<InventoryItem>(`/inventory/${variantId}/threshold`, {
    lowStockThreshold,
  });
  return res.data;
}
