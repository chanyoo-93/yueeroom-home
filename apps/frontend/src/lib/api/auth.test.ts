import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';
import { logout, refreshAuth } from './auth';

describe('auth API helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshAuth는 /auth/refresh를 호출한다', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { status: 'APPROVED' } });

    await refreshAuth();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh');
  });

  it('logout은 /auth/logout을 호출한다', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({});

    await logout();

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});
