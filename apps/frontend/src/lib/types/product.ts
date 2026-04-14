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

export interface InventoryInfo {
  id: string;
  variantId: string;
  quantity: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  inventory: InventoryInfo | null;
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

export interface ProductDetail extends Omit<Product, 'images'> {
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductsListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  nextCursor: string | null;
}
