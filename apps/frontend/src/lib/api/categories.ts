import apiClient from './client';
import type { Category } from '../types/category';

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>('/categories');
  return res.data;
}
