import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBrands, adminCreateBrand, adminDeleteBrand } from '../api/admin-brands';
import { queryKeys } from '../api/query-keys';

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: getBrands,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminCreateBrand(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}
