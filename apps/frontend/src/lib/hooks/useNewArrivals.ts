import { useQuery } from '@tanstack/react-query';
import { getNewArrivals } from '../api/products';

export function useNewArrivals() {
  return useQuery({
    queryKey: ['products', 'newArrivals'],
    queryFn: getNewArrivals,
  });
}
