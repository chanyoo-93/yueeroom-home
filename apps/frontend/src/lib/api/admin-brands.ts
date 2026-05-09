import apiClient from './client';

export interface Brand {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function getBrands(): Promise<Brand[]> {
  const res = await apiClient.get<Brand[]>('/brands');
  return res.data;
}

export async function adminCreateBrand(name: string): Promise<Brand> {
  const res = await apiClient.post<Brand>('/brands', { name });
  return res.data;
}

export async function adminDeleteBrand(id: string): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}
