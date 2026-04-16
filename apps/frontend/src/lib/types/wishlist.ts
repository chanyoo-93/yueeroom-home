export interface WishlistProduct {
  id: string;
  name: string;
  basePrice: number;
  images: { id: string; url: string; order: number }[];
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: WishlistProduct;
}
