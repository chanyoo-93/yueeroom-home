import apiClient from './client';
import type { ProductDetail, ProductsListResponse, ProductVariant } from '../types/product';

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
    params: { limit: 100, sort: 'latest' },
  });
  return res.data;
}

export async function getProductDetail(id: string): Promise<ProductDetail> {
  const res = await apiClient.get<ProductDetail>(`/products/${id}`);
  return res.data;
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const res = await apiClient.get<ProductVariant[]>(`/products/${productId}/variants`);
  return res.data;
}
