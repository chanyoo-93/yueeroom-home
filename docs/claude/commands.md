# Commands

## Monorepo (root)

```bash
pnpm install           # 의존성 설치
pnpm dev               # 전체 앱 개발 서버 (turbo)
pnpm build             # 전체 빌드
pnpm test              # 전체 테스트
pnpm lint              # 전체 린트
pnpm type-check        # 전체 타입 체크
pnpm format            # 전체 포맷 수정
pnpm format:check      # 포맷 검사만
```

## Frontend (`apps/frontend`)

```bash
# 루트에서 실행
pnpm --filter @yueeroom/frontend dev
pnpm --filter @yueeroom/frontend test:coverage

# apps/frontend 디렉터리 내에서 실행
cd apps/frontend
npx vitest run                              # 전체 테스트
npx vitest run src/components/layout/       # 특정 디렉터리
npx vitest run src/app/login/page.test.tsx  # 단일 파일
```

> **중요**: vitest는 반드시 `apps/frontend` 디렉터리에서 실행. 루트에서 `npx --prefix apps/frontend vitest run` 사용 시 루트 설정이 적용되어 오동작.

## Backend (`apps/backend`)

```bash
pnpm --filter @yueeroom/backend dev
pnpm --filter @yueeroom/backend test
pnpm --filter @yueeroom/backend test:coverage
pnpm --filter @yueeroom/backend prisma:generate   # Prisma 클라이언트 생성
pnpm --filter @yueeroom/backend prisma:migrate    # 마이그레이션 실행
pnpm --filter @yueeroom/backend prisma:studio     # Prisma Studio
```
