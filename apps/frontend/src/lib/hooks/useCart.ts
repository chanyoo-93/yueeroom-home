'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart } from '../api/cart';
import { queryKeys } from '../api/query-keys';
import { useCartStore, type LocalCartItem } from '../stores/cart';
import type { Cart } from '../types/cart';

function cartToLocalItems(cart: Cart): LocalCartItem[] {
  return cart.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    productId: item.variant.productId,
    productName: item.variant.product.name,
    productImageUrl: item.variant.product.images[0]?.url ?? null,
    color: item.variant.color,
    size: item.variant.size,
    price: item.variant.price,
    quantity: item.quantity,
    stock: item.variant.inventory?.quantity ?? 0,
  }));
}

/** 서버 장바구니 조회 + Zustand 스토어 동기화 */
export function useCart() {
  const syncFromServer = useCartStore((s) => s.syncFromServer);

  const query = useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: getCart,
    staleTime: 1000 * 30, // 30초
  });

  useEffect(() => {
    if (query.data) {
      syncFromServer(cartToLocalItems(query.data));
    }
  }, [query.data, syncFromServer]);

  return query;
}

/** 장바구니에 상품 추가 */
export function useAddCartItem() {
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);

  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      addCartItem(variantId, quantity),
    onSuccess: (newItem, { variantId, quantity }) => {
      // 낙관적 업데이트가 없으므로 서버 응답 후 쿼리 무효화
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      // Zustand 스토어에도 반영 (서버 ID 사용)
      addItem({
        id: newItem.id,
        variantId,
        productId: '',
        productName: '',
        productImageUrl: null,
        color: '',
        size: '',
        price: 0,
        quantity,
        stock: 0,
      });
    },
  });
}

/** 장바구니 항목 수량 수정 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

/** 장바구니 항목 삭제 */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const removeItem = useCartStore((s) => s.removeItem);

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; variantId: string }) => removeCartItem(itemId),
    onSuccess: (_, { variantId }) => {
      removeItem(variantId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

/** 장바구니 전체 비우기 */
export function useClearCart() {
  const queryClient = useQueryClient();
  const clearStore = useCartStore((s) => s.clearCart);

  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      clearStore();
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
