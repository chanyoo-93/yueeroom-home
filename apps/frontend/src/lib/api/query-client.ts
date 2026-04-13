import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

// Next.js App Router: 서버 컴포넌트에서 요청마다 격리된 인스턴스를 반환하도록 `cache` 래핑
// 클라이언트 컴포넌트에서는 Provider 레벨에서 useState를 통해 별도로 관리할 것
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60, // 1분
          retry: 1,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: 0,
        },
      },
    }),
);
