import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const TIMEOUT_MS = 10_000;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  withCredentials: true, // JWT 쿠키 전송
});

// ── 요청 인터셉터: Access Token 헤더 자동 추가 ────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) {
        config.headers['Authorization'] = `Bearer ${decodeURIComponent(match[1] ?? '')}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── 응답 인터셉터: 401 시 토큰 재발급 후 재시도 ──────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err: unknown) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await apiClient.post<{ accessToken: string }>('/auth/refresh');
        if (typeof window !== 'undefined') {
          const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
          document.cookie = `access_token=${refreshRes.data.accessToken}; path=/; SameSite=Strict${secure}`;
        }
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        if (typeof window !== 'undefined') {
          document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          window.location.replace('/login');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
