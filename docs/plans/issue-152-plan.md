# Issue #152 구현 계획 — 운영 필수 환경 변수 검증 모듈

## Context

JWT_SECRET, STRIPE_SECRET_KEY, OAuth secret 등 필수 환경 변수가 누락되어도 NestJS 앱이
부팅되는 문제. ConfigModule에 `validate` 옵션이 없어 누락 시 런타임 오류나 빈 문자열 동작으로
발견됨. 이를 해결하기 위해 부팅 시점에 검증하여 production에서 필수 secret 누락 시 서버를
시작하지 않도록 한다.

---

## 1. 관련 파일 목록

| 역할               | 파일 경로                                        |
| ------------------ | ------------------------------------------------ |
| ConfigModule 설정  | `apps/backend/src/app.module.ts`                 |
| 검증 함수 (신규)   | `apps/backend/src/config/env.validation.ts`      |
| 검증 테스트 (신규) | `apps/backend/src/config/env.validation.spec.ts` |
| 환경변수 템플릿    | `.env.example`                                   |

---

## 2. 현재 구조 요약

- `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] })` — `validate` 미설정
- `config/` 디렉토리 없음 (신규 생성 필요)
- `configService.get()` 사용처 8개 파일, `process.env` 직접 참조 3개 파일 (main.ts, instrument.ts, auth.controller.ts)
- `.env.example`과 코드 간 키 이름 불일치:

| .env.example                 | 실제 코드 사용 키      | 비고                                      |
| ---------------------------- | ---------------------- | ----------------------------------------- |
| `KAKAO_PAY_APP_ADMIN_KEY`    | `KAKAO_PAY_SECRET_KEY` | 이름 불일치                               |
| `NAVER_PAY_CLIENT_ID/SECRET` | (미사용)               | `NAVER_CLIENT_ID/SECRET`이 소셜+결제 겸용 |
| (없음)                       | `KAKAO_CALLBACK_URL`   | 누락                                      |
| (없음)                       | `NAVER_CALLBACK_URL`   | 누락                                      |
| (없음)                       | `ADMIN_EMAIL`          | 누락                                      |
| (없음)                       | `REDIS_URL`            | 누락 (redis.service.ts 사용)              |

---

## 3. 변경 지점

### 3-1. 신규: `apps/backend/src/config/env.validation.ts`

신규 의존성 없이 `@nestjs/config` 내장 `validate` 옵션 활용.

```typescript
const ALWAYS_REQUIRED = ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

const PRODUCTION_REQUIRED = [
  'FRONTEND_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'STRIPE_SECRET_KEY',
  'KAKAO_PAY_SECRET_KEY',
  'KAKAO_PAY_CID',
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'KAKAO_CALLBACK_URL',
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
  'NAVER_CALLBACK_URL',
  'NAVER_PAY_CHAIN_ID',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'CDN_URL',
  'SES_FROM_EMAIL',
  'ADMIN_EMAIL',
  'SENTRY_DSN',
] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing: string[] = [];

  for (const key of ALWAYS_REQUIRED) {
    if (!config[key]) missing.push(key);
  }

  if (config['NODE_ENV'] === 'production') {
    for (const key of PRODUCTION_REQUIRED) {
      if (!config[key]) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `환경 변수 검증 실패 — 다음 변수가 누락되었습니다:\n${missing.map((k) => `  - ${k}`).join('\n')}`,
    );
  }

  return config;
}
```

### 3-2. 수정: `apps/backend/src/app.module.ts`

```typescript
import { validateEnv } from './config/env.validation';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
  validate: validateEnv, // 추가
});
```

### 3-3. 신규: `apps/backend/src/config/env.validation.spec.ts`

| 테스트 케이스                                 | 기댓값                           |
| --------------------------------------------- | -------------------------------- |
| `JWT_SECRET` 누락 (dev)                       | Error throw, 변수명 포함         |
| `JWT_REFRESH_SECRET` 누락 (dev)               | Error throw, 변수명 포함         |
| production에서 `PRODUCTION_REQUIRED` 1개 누락 | Error throw, 변수명 포함         |
| production에서 복수 변수 누락                 | Error throw, 누락 변수 모두 나열 |
| development에서 `PRODUCTION_REQUIRED` 없음    | 통과 (Error 없음)                |
| 모든 필수 변수 제공 (production)              | config 객체 그대로 반환          |

### 3-4. 수정: `.env.example`

| 변경 유형      | 내용                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| 키 이름 변경   | `KAKAO_PAY_APP_ADMIN_KEY` → `KAKAO_PAY_SECRET_KEY`                      |
| 항목 제거      | `NAVER_PAY_CLIENT_ID`, `NAVER_PAY_CLIENT_SECRET` (코드 미사용)          |
| 항목 추가      | `KAKAO_CALLBACK_URL`, `NAVER_CALLBACK_URL`, `ADMIN_EMAIL`, `REDIS_URL`  |
| 항목 주석 처리 | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (docker compose 전용 명시) |

---

## 4. 잠재적 위험

| 위험                                                                                | 대응                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| production .env에 현재 누락된 변수가 있으면 재배포 시 앱 시작 불가                  | 의도된 동작; 배포 전 `.env.example` 기준으로 변수 점검                           |
| `SENTRY_DSN`은 `instrument.ts`에서 ConfigModule 초기화 전 `process.env`로 직접 사용 | ConfigModule validate에 포함해 early-fail 유도; instrument.ts 동작에는 영향 없음 |
| `REDIS_URL` vs `REDIS_HOST/PORT` 불일치                                             | `.env.example`에서 `REDIS_URL`로 통일, docker-compose는 HOST/PORT 유지           |

---

## 5. 구현 순서

1. `apps/backend/src/config/env.validation.ts` 작성
2. `apps/backend/src/config/env.validation.spec.ts` 작성 (TDD)
3. 테스트 통과 확인
4. `apps/backend/src/app.module.ts` — `validate` 옵션 추가
5. `.env.example` 키 정리

---

## 6. 테스트 전략

```bash
# 유닛 테스트 실행
pnpm --filter @yueeroom/backend test -- --silent apps/backend/src/config/env.validation.spec.ts
```

**수동 통합 확인:**

- `.env.local`에서 `JWT_SECRET` 제거 → `pnpm dev` 실행 시 에러 메시지와 함께 프로세스 종료
- 복구 후 → 정상 부팅 확인
