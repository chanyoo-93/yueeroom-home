import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPayments, requestRefund } from '../api/payments';
import { queryKeys } from '../api/query-keys';

export function usePayments(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.payments.list(), page, limit],
    queryFn: () => getPayments(page, limit),
    placeholderData: (previousData) => previousData,
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      requestRefund(paymentId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}
