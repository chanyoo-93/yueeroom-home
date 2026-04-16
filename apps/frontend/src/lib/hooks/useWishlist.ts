'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWishlistItem, getWishlist, removeWishlistItem } from '../api/wishlists';
import { queryKeys } from '../api/query-keys';

export function useWishlist() {
  return useQuery({
    queryKey: queryKeys.wishlist.all,
    queryFn: getWishlist,
    staleTime: 1000 * 60, // 1분
  });
}

export function useWishlistStatus(productId: string) {
  const { data: items = [] } = useWishlist();
  return items.some((item) => item.productId === productId);
}

export function useAddWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => addWishlistItem(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },
  });
}

export function useRemoveWishlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => removeWishlistItem(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },
  });
}
