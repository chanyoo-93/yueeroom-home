import { useQuery } from '@tanstack/react-query';
import { getAdminSalesStats, getAdminOrderStats } from '../api/admin-stats';
import { queryKeys } from '../api/query-keys';

export function useAdminSalesStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats.sales,
    queryFn: getAdminSalesStats,
  });
}

export function useAdminOrderStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats.orders,
    queryFn: getAdminOrderStats,
  });
}
