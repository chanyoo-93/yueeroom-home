import apiClient from './client';
import type { ProductsListResponse } from '../types/product';

export type SortOrder = 'latest' | 'price_asc' | 'price_desc';

export interface ProductListParams {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  sort?: SortOrder;
  page?: number;
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductsListResponse> {
  const res = await apiClient.get<ProductsListResponse>('/products', {
    params: { limit: 20, ...params },
  });
  return res.data;
}

export async function getNewArrivals(): Promise<ProductsListResponse> {
  const res = await apiClient.get<ProductsListResponse>('/products', {
    params: { limit: 8, sort: 'latest' },
  });
  return res.data;
}
