import { useQuery } from '@tanstack/react-query';
import { getAddresses } from '../api/users';
import { queryKeys } from '../api/query-keys';

export function useAddresses() {
  return useQuery({
    queryKey: queryKeys.users.addresses,
    queryFn: getAddresses,
  });
}
