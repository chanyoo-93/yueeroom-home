import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import type { ProductListParams } from '../api/products';
import { queryKeys } from '../api/query-keys';

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => getProducts(params),
  });
}
