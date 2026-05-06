import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRequestUse = vi.fn();
const mockResponseUse = vi.fn();
const mockPost = vi.fn();

// apiClient를 함수로도 동작하게 해야 retry(apiClient(originalRequest)) 호출이 가능
const mockApiClientInstance = Object.assign(vi.fn().mockResolvedValue({ data: [] }), {
  defaults: { baseURL: 'http://localhost:4000/api', timeout: 10000 },
  interceptors: {
    request: { use: mockRequestUse },
    response: { use: mockResponseUse },
  },
  post: mockPost,
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApiClientInstance),
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

describe('401 인터셉터 — refresh 후 access_token 쿠키 저장', () => {
  let errorHandler: (error: unknown) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    mockResponseUse.mockClear();
    mockPost.mockClear();
    mockApiClientInstance.mockClear();

    await import('./client');

    errorHandler = mockResponseUse.mock.calls[0]![1] as (error: unknown) => Promise<unknown>;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('refresh 성공 시 새 accessToken을 access_token 쿠키에 저장한다', async () => {
    const newToken = 'new.jwt.token';
    // refresh 성공 → retry 성공
    mockPost.mockResolvedValueOnce({ data: { accessToken: newToken } });
    mockApiClientInstance.mockResolvedValueOnce({ data: [] });

    const mockError = {
      response: { status: 401 },
      config: { url: '/categories', _retry: false },
      isAxiosError: true,
    };

    await errorHandler(mockError);

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh');
    expect(document.cookie).toContain(`access_token=${newToken}`);
  });

  it('refresh 실패 시 access_token 쿠키를 만료 처리한다', async () => {
    mockPost.mockRejectedValueOnce(new Error('refresh failed'));

    const replaceFn = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceFn },
      writable: true,
    });

    document.cookie = 'access_token=old.token; path=/';

    const mockError = {
      response: { status: 401 },
      config: { url: '/categories', _retry: false },
      isAxiosError: true,
    };

    try {
      await errorHandler(mockError);
    } catch {
      // 예상된 reject
    }

    expect(document.cookie).not.toContain('access_token=old.token');
    expect(replaceFn).toHaveBeenCalledWith('/login');
  });
});
