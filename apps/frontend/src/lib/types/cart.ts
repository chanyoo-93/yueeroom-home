export interface CartItemVariantProduct {
  id: string;
  name: string;
  images: { id: string; url: string; order: number }[];
}

export interface CartItemVariantInventory {
  quantity: number;
}

export interface CartItemVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  product: CartItemVariantProduct;
  inventory: CartItemVariantInventory | null;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  variant: CartItemVariant;
}

export interface Cart {
  id: string | null;
  userId: string;
  items: CartItem[];
}
