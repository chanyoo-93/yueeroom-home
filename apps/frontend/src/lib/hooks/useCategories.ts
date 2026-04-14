import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../api/categories';
import { queryKeys } from '../api/query-keys';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: getCategories,
  });
}
