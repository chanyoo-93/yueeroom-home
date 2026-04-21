import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminOrders, updateAdminOrderStatus, updateAdminOrderTracking } from '../api/admin';
import { queryKeys } from '../api/query-keys';
import type { OrderStatus } from '../types/order';

export function useAdminOrders(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.admin.orders.list(page),
    queryFn: () => getAdminOrders(page, limit),
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
      carrier,
      trackingNumber,
    }: {
      orderId: string;
      status: OrderStatus;
      carrier?: string;
      trackingNumber?: string;
    }) => updateAdminOrderStatus(orderId, { status, carrier, trackingNumber }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useUpdateAdminOrderTracking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      carrier,
      trackingNumber,
    }: {
      orderId: string;
      carrier: string;
      trackingNumber: string;
    }) => updateAdminOrderTracking(orderId, { carrier, trackingNumber }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
