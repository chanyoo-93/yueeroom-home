import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRequestUse = vi.fn();
const mockResponseUse = vi.fn();
const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: { baseURL: 'http://localhost:4000/api', timeout: 10000 },
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
      post: mockPost,
    })),
  },
}));

describe('API Client', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockRequestUse.mockClear();
    mockResponseUse.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('baseURL과 timeout이 설정된 axios 인스턴스를 생성한다', async () => {
    const axios = await import('axios');
    await import('./client');

    expect(axios.default.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.stringContaining('/api'),
        timeout: expect.any(Number),
        withCredentials: true,
      }),
    );
  });

  it('요청 인터셉터가 등록된다', async () => {
    await import('./client');

    expect(mockRequestUse).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
  });

  it('응답 인터셉터가 등록된다', async () => {
    await import('./client');

    expect(mockResponseUse).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
  });

  it('apiClient를 default export로 내보낸다', async () => {
    const { apiClient } = await import('./client');

    expect(apiClient).toBeDefined();
    expect(apiClient.interceptors).toBeDefined();
  });
});
