import apiClient from './client';
import type { Category } from '../types/category';

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>('/categories');
  return res.data;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function adminCreateCategory(payload: CreateCategoryPayload): Promise<Category> {
  const res = await apiClient.post<Category>('/categories', payload);
  return res.data;
}

export async function adminUpdateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<Category> {
  const res = await apiClient.patch<Category>(`/categories/${id}`, payload);
  return res.data;
}

export async function adminDeleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
