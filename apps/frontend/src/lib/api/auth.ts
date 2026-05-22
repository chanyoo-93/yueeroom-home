import { apiClient } from '@/lib/api/client';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export function refreshAuth() {
  return apiClient.post<{ status: UserStatus }>('/auth/refresh');
}

export function logout() {
  return apiClient.post('/auth/logout');
}
