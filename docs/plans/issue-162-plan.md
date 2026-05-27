# Issue #162 구현 플랜: 운영 Swagger 문서 접근 제한

## Context

`main.ts`에서 Swagger가 `NODE_ENV`에 관계없이 무조건 활성화되어 있어,
production에서도 `/api/docs`가 공개 노출될 위험이 있다.
`NODE_ENV !== 'production'` 조건으로 Swagger 설정 블록을 감싸 production에서 완전히 비활성화한다.
Staging(NODE_ENV=staging)에서는 기존과 동일하게 접근 가능하다.

---

## 1. 관련 파일 목록

| 파일                               | 역할                                  |
| ---------------------------------- | ------------------------------------- |
| `apps/backend/src/main.ts`         | Swagger 설정 및 등록 (주요 수정 대상) |
| `.github/workflows/cd-backend.yml` | Staging 통합 테스트 (검증 추가 대상)  |
| `docs/plans/issue-162-plan.md`     | 작업 계획 저장 위치                   |

---

## 2. 현재 구조 요약

```
main.ts (bootstrap)
├── helmet()
├── cookieParser()
├── ValidationPipe (global)
├── HttpExceptionFilter (global)
├── CORS 설정
├── setGlobalPrefix('api')
├── DocumentBuilder → SwaggerModule.createDocument → SwaggerModule.setup  ← 무조건 실행
└── app.listen(port)
```

- `SwaggerModule.setup('api/docs', app, document)` 이 NODE_ENV 조건 없이 실행됨
- CD에서 production은 `NODE_ENV=production`, staging은 `NODE_ENV=staging`으로 분리
- env.validation.ts의 `PRODUCTION_REQUIRED` 조건도 `NODE_ENV === 'production'`으로 구분됨
- Health check는 `/api/health`만 확인 → Swagger 변경으로 영향 없음

---

## 3. 변경해야 할 지점

### `apps/backend/src/main.ts`

**Before (lines 32–44):**

```typescript
const config = new DocumentBuilder()
  .setTitle('유이룸 API')
  .setDescription('Yu-ee Room 쇼핑몰 API 문서')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);

const port = process.env['PORT'] ?? 4000;
await app.listen(port);
console.log(`Server running on http://localhost:${port}`);
console.log(`API docs: http://localhost:${port}/api/docs`);
```

**After:**

```typescript
const port = process.env['PORT'] ?? 4000;
await app.listen(port);
console.log(`Server running on http://localhost:${port}`);

if (process.env['NODE_ENV'] !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('유이룸 API')
    .setDescription('Yu-ee Room 쇼핑몰 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  console.log(`API docs: http://localhost:${port}/api/docs`);
}
```

> `console.log('API docs: ...')` 도 조건 블록 안으로 이동한다.

### `.github/workflows/cd-backend.yml` (선택적)

Staging 통합 테스트에 `/api/docs` 접근 확인을 추가해 정책이 올바르게 동작하는지 검증한다:

```yaml
check "/api/docs"  "200" # staging: Swagger 접근 가능 확인
```

---

## 4. 잠재적 위험

| 위험                        | 설명                                                                                  | 대응                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| NODE_ENV 누락               | 배포 환경에 NODE_ENV 미설정 시 Swagger가 노출됨                                       | env.validation.ts의 ALWAYS_REQUIRED에 이미 포함, 미설정이면 부트 실패 |
| Staging NODE_ENV 오설정     | Staging에 NODE_ENV=production 이 설정되면 Swagger도 비활성화됨                        | CD가 branch 기반으로 environment를 분리하므로 문제 없음               |
| `/api/docs-json` 엔드포인트 | SwaggerModule이 문서 JSON도 함께 제공하는데, 동일 조건으로 묶이므로 동시에 비활성화됨 | 추가 조치 불필요                                                      |
| health check 영향           | `/api/health`는 Swagger와 무관한 별도 컨트롤러                                        | 영향 없음                                                             |

---

## 5. 구현 순서

1. **feature 브랜치 생성** — `feature/issue162-restrict-swagger-in-production`
2. **main.ts 수정** — Swagger 블록을 `NODE_ENV !== 'production'` 조건으로 감쌈
3. **cd-backend.yml 수정** (선택) — Staging 통합 테스트에 `/api/docs → 200` 검증 추가
4. **로컬 검증** — `NODE_ENV=production node dist/main` 으로 `/api/docs` 404 확인
5. **커밋 → 푸시 → PR** — `Closes #162` 포함

---

## 6. 테스트 전략

### 로컬 수동 검증

```bash
# Production 환경 시뮬레이션
NODE_ENV=production node apps/backend/dist/main
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs
# → 404 기대

# Development 환경 (기존 동작 유지)
NODE_ENV=development node apps/backend/dist/main
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/docs
# → 200 기대
```

### CD Staging 통합 테스트 (선택)

```yaml
# cd-backend.yml 기존 check 블록에 추가
check "/api/docs"  "200" # staging에서 Swagger 접근 가능 확인
```

### 유닛 테스트

- `main.ts`는 부트스트랩 함수라 유닛 테스트 대상이 아님
- 기존 테스트 Suite 영향 없음 (`http-exception.filter.spec.ts` 등)
- 백엔드 전체 테스트는 실행 후 통과 확인: `pnpm --filter @yueeroom/backend test -- --silent`
