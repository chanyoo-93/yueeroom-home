import apiClient from './client';
import type { ProductsListResponse } from '../types/product';

export async function getNewArrivals(): Promise<ProductsListResponse> {
  const res = await apiClient.get<ProductsListResponse>('/products', {
    params: { limit: 8, sort: 'latest' },
  });
  return res.data;
}
