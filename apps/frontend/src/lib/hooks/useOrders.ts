import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, getOrders, getOrder } from '../api/orders';
import { queryKeys } from '../api/query-keys';
import type { CreateOrderDto } from '../types/order';

export function useOrders(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.orders.list(), page, limit],
    queryFn: () => getOrders(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
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
