import { useQuery } from '@tanstack/react-query';
import { getChildren } from '../api/users';
import { queryKeys } from '../api/query-keys';

export function useChildren() {
  return useQuery({
    queryKey: queryKeys.users.children,
    queryFn: getChildren,
  });
}
