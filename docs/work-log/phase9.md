# Phase 9 — 인프라 · CI/CD · 모니터링 · 론칭 E2E (PR #115~125)

> Phase 9 목표: 프로덕션 인프라 완성 및 서비스 론칭 준비

---

## PR #115 — CD Frontend (S3 + CloudFront 배포 자동화)

**브랜치**: `feature/phase9-issue59-cd-frontend-s3-cloudfront`

- GitHub Actions 워크플로우: S3 업로드 + CloudFront 캐시 무효화 자동화
- Next.js 정적 export를 S3에 배포, CloudFront로 서빙

---

## PR #116 — 주문 관련 기능

**브랜치**: `claude/work-issue-60-fmvZS`

---

## PR #117 — 결제 관련 기능

**브랜치**: `claude/work-issue-61-CRHUb`

---

## PR #118 — CloudFront WAF 설정

**브랜치**: `feature/phase9-issue62-cloudfront-waf-setup`

- CRS, SQLi, KnownBadInputs 관리형 룰
- Rate Limit 설정
- Admin IP 화이트리스트

---

## PR #119 — CloudWatch + Sentry 모니터링 연동 (#63)

**브랜치**: `claude/work-issue-63-wVotF`

- CloudWatch 메트릭 알람 5개: ECS CPU/메모리, RDS CPU/스토리지/메모리
- Sentry DSN ECS 시크릿 추가 및 롤링 배포
- GitHub Actions OIDC 신뢰 정책에 staging 환경 복원

---

## PR #120 — RDS 자동 백업 및 AWS Backup 설정 (#64)

**브랜치**: `feature/phase9-issue64-db-backup-config`

- 일별 자동 백업 (7일 보존) + 주별 스냅샷 (5주) + 장기 볼트 (1년)
- 실패 알람: EventBridge → SNS (`chan1536@naver.com` 구독)
- Free Tier 제한으로 `backup_retention_period: 7 → 1`
- 관련 문서: `docs/db-backup-recovery.md`

---

## PR #121~125 — 론칭 체크리스트 이슈 #65

**브랜치**: `claude/work-issue-65-39AJu` (최종 PR: #125)

### 조치 완료 항목

- 법적: `/terms`, `/privacy` 페이지 + 미들웨어 공개 경로 등록
- 보안: HTTPS (CloudFront redirect-to-https + ALB 301), TLS 1.2+/1.3
- 보안: 미인증 차단 이중 확인 (middleware.ts + JwtAuthGuard·UserStatusGuard)
- WAF 배포 완료
- `.env.example`에 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `SENTRY_DSN` 추가

### Stripe 결제 연동 (PR #125 포함)

- Stripe SDK v17.7.0 (v22 타입 호환성 문제로 다운그레이드 유지)
- Webhook 등록: `https://api.yueeroom.com/api/payments/stripe/webhook`
- SSM에 `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` 등록
- GitHub Secret에 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` 등록
- ecs.tf에 Stripe 시크릿 추가 + terraform apply 완료

---

## PR #122~124 — E2E 검증 중 발견한 버그 수정

### PR #122 — 장바구니 undefined map 방어 처리

- `cart.items` 및 Zustand items null 안전 처리 (`Array.isArray()` early return)

### PR #123 — 홈 CategoryQuickLinks 크래시 방어

- `data`가 배열 아닐 때 filter 오류 처리

### PR #124 — categories 공개 엔드포인트

- `GET /categories`에 `@Public()` 추가 (미인증 사용자 카테고리 조회 가능)

---

## PR #127~128 — E2E 검증 중 발견한 인프라/인증 버그 수정

### PR #127 — Bearer 헤더 추가 (401 인증 버그)

- **원인**: `access_token` 쿠키가 `yueeroom.com`에만 설정되어 `api.yueeroom.com` 요청에 미포함
- **수정**: Axios 요청 인터셉터에서 쿠키에서 토큰 읽어 Bearer 헤더 자동 추가
- `decodeURIComponent` 제거 (JWT base64url은 URI 디코딩 불필요, URIError 위험)

### PR #128 — AdminGuard 추가

- 정적 export 환경에서 비관리자의 `/admin` 접근 차단
- JWT 디코딩 로직을 `lib/utils/jwt.ts`로 추출

---

## E2E 검증 중 발견한 인프라 이슈 4건 (2026-05-08~09)

| 문제                                        | 수정                                               |
| ------------------------------------------- | -------------------------------------------------- |
| CloudFront URL 재작성 함수 누락             | `aws_cloudfront_function.url_rewrite` 추가 + apply |
| `NEXT_PUBLIC_API_URL` GitHub Secret 미설정  | Secret 생성 + 로컬 빌드 후 S3 배포                 |
| `FRONTEND_URL` ECS 환경변수 누락 (CORS)     | SSM 추가 + ecs.tf 수정 + apply                     |
| CSP `connect-src`에 `api.yueeroom.com` 누락 | `api_origin` 변수 적용 + terraform.tfvars + apply  |

### 상품 상세 페이지 내비게이션 실패 (2026-05-09 수정)

- **원인 1**: CloudFront URL rewrite가 trailing slash만 처리, `index.txt` 경로 미처리
- **원인 2**: `useParams()`가 pre-render 시점 params(`{ id: '_' }`) 반환
- **수정 1**: CloudFront 함수를 `parts.length >= 3` 조건으로 확장, 동적 세그먼트 하위 모든 경로를 `_`로 치환
- **수정 2**: `useParams()` → `usePathname().split('/')[2]`로 실제 브라우저 URL에서 ID 파싱

---

## E2E 검증 진행 현황 (2026-05-15 기준)

| 플로우                                   | 상태                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| 플로우 1 — 회원가입 → 승인 → 로그인      | ✅ 완료 (2026-05-08)                                        |
| 플로우 2 — 상품 → 장바구니 → 주문 → 결제 | 부분 완료 (카카오페이 주문ID 생성 확인, Stripe 결제 미진행) |
| 플로우 3 — 환불                          | ❌ 미진행                                                   |
| 플로우 4 — 관리자 대시보드               | ❌ 미진행                                                   |

> 자세한 내용: [pending.md](pending.md)
