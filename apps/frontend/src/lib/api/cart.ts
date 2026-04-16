import apiClient from './client';
import type { Cart, CartItem } from '../types/cart';

export async function getCart(): Promise<Cart> {
  const res = await apiClient.get<Cart>('/cart');
  return res.data;
}

export async function addCartItem(variantId: string, quantity: number): Promise<CartItem> {
  const res = await apiClient.post<CartItem>('/cart/items', { variantId, quantity });
  return res.data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartItem> {
  const res = await apiClient.patch<CartItem>(`/cart/items/${itemId}`, { quantity });
  return res.data;
}

export async function removeCartItem(itemId: string): Promise<void> {
  await apiClient.delete(`/cart/items/${itemId}`);
}

export async function clearCart(): Promise<void> {
  await apiClient.delete('/cart');
}
