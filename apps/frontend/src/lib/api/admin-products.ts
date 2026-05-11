import apiClient from './client';
import type { Product, ProductDetail, ProductVariant } from '../types/product';

export interface CreateProductPayload {
  categoryId: string;
  brandId?: string | null;
  name: string;
  description?: string;
  basePrice: number;
  isActive?: boolean;
  variants?: CreateVariantPayload[];
}

export interface UpdateProductPayload {
  categoryId?: string;
  brandId?: string | null;
  name?: string;
  description?: string;
  basePrice?: number;
  isActive?: boolean;
}

export interface CreateVariantPayload {
  size: string;
  color: string;
  sku: string;
  price: number;
}

export interface AdminProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  nextCursor: string | null;
}

export async function adminGetProducts(page = 1): Promise<AdminProductListResponse> {
  const res = await apiClient.get<AdminProductListResponse>('/products', {
    params: { page, limit: 20 },
  });
  return res.data;
}

export async function adminGetProductDetail(id: string): Promise<ProductDetail> {
  const res = await apiClient.get<ProductDetail>(`/products/${id}`);
  return res.data;
}

export async function adminCreateProduct(payload: CreateProductPayload): Promise<Product> {
  const res = await apiClient.post<Product>('/products', payload);
  return res.data;
}

export async function adminUpdateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await apiClient.patch<Product>(`/products/${id}`, payload);
  return res.data;
}

export async function adminDeleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function adminCreateVariant(
  productId: string,
  payload: CreateVariantPayload,
): Promise<ProductVariant> {
  const res = await apiClient.post<ProductVariant>(`/products/${productId}/variants`, payload);
  return res.data;
}

export async function adminDeleteVariant(productId: string, variantId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/variants/${variantId}`);
}

export async function adminUploadImage(productId: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ url: string }>(`/products/${productId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function adminDeleteImage(productId: string, imageId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}/images/${imageId}`);
}
