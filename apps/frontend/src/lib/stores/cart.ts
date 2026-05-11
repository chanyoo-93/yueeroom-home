import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LocalCartItem {
  /** CartItem ID (서버에서 발급된 ID, 없으면 임시 키) */
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  color: string;
  size: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartState {
  items: LocalCartItem[];
  addItem: (item: LocalCartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  /** 서버에서 받아온 장바구니 데이터로 스토어를 전체 갱신 */
  syncFromServer: (items: LocalCartItem[]) => void;
  /** 바로 주문: 장바구니를 거치지 않고 단일 상품을 즉시 결제 */
  buyNow: LocalCartItem | null;
  setBuyNow: (item: LocalCartItem) => void;
  clearBuyNow: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === newItem.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.stock) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, newItem] };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i,
          ),
        })),

      clearCart: () => set({ items: [] }),

      syncFromServer: (items) => set({ items }),

      buyNow: null,
      setBuyNow: (item) => set({ buyNow: item }),
      clearBuyNow: () => set({ buyNow: null }),
    }),
    {
      name: 'yueeroom-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
