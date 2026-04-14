export interface ProductImage {
  id: string;
  url: string;
  order: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory;
  images?: ProductImage[];
}

export interface ProductsListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  nextCursor: string | null;
}
