export interface InventoryItem {
  id: string;
  variantId: string;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: string;
  variant: {
    id: string;
    sku: string;
    size: string;
    color: string;
    price: number;
    product: {
      id: string;
      name: string;
    };
  };
}
