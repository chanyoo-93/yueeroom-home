# Testing & CI

## Testing Conventions

### Frontend (Vitest + React Testing Library)

- `vi.mock('next/navigation', ...)` — `useRouter`, `usePathname` 모킹
- `vi.mock('next/link', ...)` — `<a>` 태그로 대체
- `vi.mock('@/lib/api/client', ...)` — `apiClient.get`, `apiClient.post` 모킹
- `axios.isAxiosError()` 통과: mock 객체에 `isAxiosError: true` 프로퍼티 필요
- polling 테스트: `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`

### Backend (Jest)

- `apps/backend/src/**/*.spec.ts` — 단위/통합 테스트
- `apps/backend/test/**/*.e2e-spec.ts` — E2E 테스트 (`jest-e2e.config.ts` 별도 설정)

## CI Pipeline (`.github/workflows/ci.yml`)

PR 대상 브랜치: `main`, `staging`

1. Lint & Format Check
2. Type Check
3. Backend Tests — PostgreSQL 16 + Redis 7 서비스 컨테이너
4. Frontend Tests
5. Build Check — lint/type-check 완료 후, `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
