import { useQuery } from '@tanstack/react-query';
import { getNewArrivals } from '../api/products';
import { queryKeys } from '../api/query-keys';

export function useNewArrivals() {
  return useQuery({
    queryKey: queryKeys.products.list({ limit: 8, sort: 'latest' }),
    queryFn: getNewArrivals,
  });
}
