import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminGetInventories,
  adminUpdateInventoryQuantity,
  adminUpdateInventoryThreshold,
} from '../api/admin-inventory';
import { queryKeys } from '../api/query-keys';

export function useAdminInventory() {
  return useQuery({
    queryKey: queryKeys.admin.inventory.all,
    queryFn: adminGetInventories,
  });
}

export function useUpdateInventoryQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      adminUpdateInventoryQuantity(variantId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventory.all });
    },
  });
}

export function useUpdateInventoryThreshold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantId,
      lowStockThreshold,
    }: {
      variantId: string;
      lowStockThreshold: number;
    }) => adminUpdateInventoryThreshold(variantId, lowStockThreshold),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.inventory.all });
    },
  });
}
