# 유이룸 작업 로그 — 개요

> 다른 에이전트가 작업 맥락을 파악할 수 있도록 작성된 문서.  
> 최종 갱신: 2026-05-15

## 프로젝트 요약

유이룸(Yu-ee Room) — 완전 비공개 유아/아동복 쇼핑몰. 회원은 관리자 승인 후에만 서비스 이용 가능.

- **프로덕션**: `https://yueeroom.com` / API: `https://api.yueeroom.com`
- **관리자 계정**: `admin@yueeroom.com` (role: ADMIN, status: APPROVED)
- **현재 브랜치**: `main` (최신 커밋: `718032b`)

## 기술 스택

| 영역     | 스택                                                                |
| -------- | ------------------------------------------------------------------- |
| Monorepo | pnpm 10.33.0 + Turborepo                                            |
| Frontend | Next.js (App Router, 정적 export) + TanStack Query + Zustand        |
| Backend  | NestJS + Prisma + PostgreSQL + Redis                                |
| Infra    | AWS (ECS Fargate, RDS, S3, CloudFront, WAF, CloudWatch) + Terraform |
| 결제     | Stripe, 카카오페이, 네이버페이(보류)                                |
| 모니터링 | Sentry + CloudWatch                                                 |

## 문서 인덱스

| 파일                     | 내용                                                        |
| ------------------------ | ----------------------------------------------------------- |
| [phase9.md](phase9.md)   | Phase 9 — 인프라·CI/CD·모니터링·론칭 E2E 검증 (PR #115~125) |
| [phase10.md](phase10.md) | Phase 10 — 상품·관리자 UI·버그 수정 (PR #128~145)           |
| [pending.md](pending.md) | 미완료 작업 및 다음 단계                                    |

## 핵심 워크플로우 규칙

### 브랜치 전략 (필수)

- 코드를 **한 줄이라도 수정하기 전에** feature 브랜치를 먼저 생성한다.
- 포맷: `feature/phase{N}-issue{N}-{설명}` 또는 `fix/{설명}`
- `git push origin main` 절대 금지. 반드시 PR → merge.
- 동일 실수가 2회 반복된 이력 있음 (2026-05-14, 2026-05-15).

### 커밋 메시지

```
feat(scope): 설명
fix(scope): 설명
refactor(scope): gemini 리뷰 수용 — 상세 내용
```

### PR 워크플로우

1. feature 브랜치 생성 → 작업 → 커밋
2. `gh pr create` → gemini-code-assist 자동 리뷰
3. 리뷰 수용 사항 반영 → 추가 커밋
4. CI 통과 → merge

### 코드 리뷰

- gemini-code-assist가 자동으로 PR 리뷰를 수행한다.
- 수용 사항은 별도 커밋으로 반영: `refactor(scope): gemini 리뷰 수용 — ...`

## API 구조

- 모든 엔드포인트: `/api` 접두사. 예: `POST /api/auth/login`
- Swagger: `http://localhost:4000/api/docs`
- 전역 가드: `JwtAuthGuard` → `UserStatusGuard` 순서
- 공개 엔드포인트: `@Public()` 데코레이터

## 주요 환경변수 (ECS 시크릿 / SSM)

| 변수                    | 비고                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | SSM 등록 완료                                                         |
| `STRIPE_WEBHOOK_SECRET` | SSM 등록 완료                                                         |
| `S3_BUCKET_NAME`        | `yueeroom-assets`, ECS environment 등록 완료 (2026-05-14)             |
| `CDN_URL`               | `https://assets.yueeroom.com`, ECS environment 등록 완료 (2026-05-14) |
| `FRONTEND_URL`          | CORS용, ECS 시크릿 등록 완료                                          |
| `NAVER_PAY_CHAIN_ID`    | **미등록** — 파트너 계정 필요                                         |
| `NAVER_CLIENT_ID`       | **미등록** — 파트너 계정 필요                                         |
| `NAVER_CLIENT_SECRET`   | **미등록** — 파트너 계정 필요                                         |
