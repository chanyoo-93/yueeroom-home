import { useQuery } from '@tanstack/react-query';
import { getProductDetail } from '../api/products';
import { queryKeys } from '../api/query-keys';

export function useProductDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getProductDetail(id),
    enabled: !!id,
  });
}
