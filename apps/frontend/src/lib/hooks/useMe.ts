import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/users';
import { queryKeys } from '../api/query-keys';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: getMe,
  });
}
