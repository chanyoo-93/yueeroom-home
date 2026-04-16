import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, getOrders } from '../api/orders';
import { queryKeys } from '../api/query-keys';
import type { CreateOrderDto } from '../types/order';

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders.list(),
    queryFn: getOrders,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => createOrder(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}
