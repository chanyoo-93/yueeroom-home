import apiClient from './client';
import type { WishlistItem } from '../types/wishlist';

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await apiClient.get<WishlistItem[]>('/wishlist');
  return res.data;
}

export async function addWishlistItem(productId: string): Promise<WishlistItem> {
  const res = await apiClient.post<WishlistItem>(`/wishlist/${productId}`);
  return res.data;
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}
