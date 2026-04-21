import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminUsers, approveUser, rejectUser, suspendUser, restoreUser } from '../api/admin';
import { queryKeys } from '../api/query-keys';
import type { UserStatus } from '../types/admin';

export function useAdminUsers(status?: UserStatus) {
  return useQuery({
    queryKey: queryKeys.admin.users(status),
    queryFn: () => getAdminUsers(status),
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => rejectUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => suspendUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useRestoreUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => restoreUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
