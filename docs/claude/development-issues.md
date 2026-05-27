# 개발 전환용 개선 이슈 목록

## 보안 개선

### [보안 개선] 관리자 사용자 목록 응답에서 민감 필드 제거

## 배경

관리자 API가 사용자 목록을 반환할 때 password hash, MFA secret, provider id가 함께 노출될 수 있습니다.

## 현재 문제

`AdminService.listUsers()`와 `listPendingUsers()`가 `prisma.user.findMany()`를 `select` 없이 호출합니다.

## 개선 방향

API 응답에는 `USER_SAFE_SELECT` 또는 관리자 전용 safe select를 적용합니다.

## 작업 범위

- [ ] 관리자 사용자 목록 응답 필드 정의
- [ ] `listUsers()`에 safe select 적용
- [ ] `listPendingUsers()`에 safe select 적용

## 완료 조건

- [ ] `/api/admin/users` 응답에 `password`가 없다
- [ ] `/api/admin/users` 응답에 `mfaSecret`이 없다
- [ ] 관련 서비스 테스트가 추가된다

## 우선순위

High

## 예상 난이도

Easy

## 관련 파일

- `apps/backend/src/admin/admin.service.ts`
- `apps/backend/src/admin/admin.controller.ts`
- `apps/backend/src/users/users.service.ts`

## 선행 작업

없음

### [보안 개선] Access Token 저장 방식을 HttpOnly 기반으로 재설계

## 배경

현재 프론트가 `access_token`을 non-HttpOnly cookie에 저장해 XSS 발생 시 토큰 탈취 위험이 큽니다.

## 현재 문제

`login`, `register`, refresh interceptor가 브라우저 JS에서 `access_token` cookie를 직접 설정합니다.

## 개선 방향

백엔드가 access token과 refresh token cookie를 모두 설정하거나, access token은 메모리 저장으로 전환합니다.

## 작업 범위

- [ ] 토큰 저장 정책 결정
- [ ] 백엔드 auth cookie 발급 로직 수정
- [ ] 프론트 Axios interceptor 수정

## 완료 조건

- [ ] JS에서 장기 인증 토큰을 읽을 수 없다
- [ ] refresh 흐름이 유지된다
- [ ] 로그인/회원가입/소셜 로그인 테스트가 통과한다

## 우선순위

High

## 예상 난이도

Hard

## 관련 파일

- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/auth/auth.service.ts`
- `apps/frontend/src/lib/api/client.ts`
- `apps/frontend/src/app/login/page.tsx`
- `apps/frontend/src/app/register/page.tsx`

## 선행 작업

프론트 정적 배포와 middleware 사용 방식 결정

### [보안 개선] 상품 설명 HTML 서버 사이드 정화 추가

## 배경

상품 설명은 HTML로 저장되고 상세 화면에서 `dangerouslySetInnerHTML`로 렌더링됩니다.

## 현재 문제

프론트 렌더링 시 `sanitize-html`을 적용하지만, 서버 저장 시점 검증이 없습니다.

## 개선 방향

상품 생성/수정 시 서버에서 허용 태그와 속성을 기준으로 HTML을 sanitize합니다.

## 작업 범위

- [ ] 백엔드 HTML sanitize 유틸 추가
- [ ] 상품 생성/수정 서비스에 적용
- [ ] 허용 태그/속성 정책 문서화

## 완료 조건

- [ ] 악성 script/event handler가 저장되지 않는다
- [ ] 기존 허용 HTML 렌더링은 유지된다
- [ ] XSS 방어 테스트가 추가된다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/products/products.service.ts`
- `apps/backend/src/products/dto/create-product.dto.ts`
- `apps/frontend/src/components/products/ProductDetailContent.tsx`

## 선행 작업

허용할 HTML 정책 합의

### [보안 개선] 업로드 이미지 파일 시그니처 검증 추가

## 배경

현재 파일 업로드는 MIME type과 크기만 검사합니다.

## 현재 문제

조작된 MIME type이나 polyglot 파일을 이미지로 업로드할 가능성이 남아 있습니다.

## 개선 방향

파일 magic number를 확인하고 필요하면 이미지 재인코딩 파이프라인을 도입합니다.

## 작업 범위

- [ ] JPEG/PNG/WebP magic number 검증
- [ ] 잘못된 파일에 대한 400 응답 처리
- [ ] 업로드 테스트 추가

## 완료 조건

- [ ] MIME spoofing 파일이 거부된다
- [ ] 5MB 제한이 유지된다
- [ ] S3 업로드 전 검증이 완료된다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/files/files.service.ts`
- `apps/backend/src/products/images/product-images.controller.ts`
- `apps/backend/src/products/images/product-images.service.ts`

## 선행 작업

없음

## 인증/인가 개선

### [인증/인가 개선] 관리자 MFA API에 관리자 권한 Guard 적용

## 배경

관리자 MFA 설정 API는 관리자 전용 기능이어야 합니다.

## 현재 문제

`/api/auth/admin/mfa/setup`, `/api/auth/admin/mfa/verify`에 `AdminGuard` 또는 `RolesGuard`가 없습니다.

## 개선 방향

해당 엔드포인트에 관리자 권한 검증을 명시합니다.

## 작업 범위

- [ ] MFA setup 엔드포인트에 관리자 Guard 적용
- [ ] MFA verify 엔드포인트에 관리자 Guard 적용
- [ ] 일반 사용자 접근 거부 테스트 추가

## 완료 조건

- [ ] CUSTOMER 사용자는 403을 받는다
- [ ] ADMIN 사용자는 기존 기능을 사용할 수 있다
- [ ] auth controller 테스트가 갱신된다

## 우선순위

Medium

## 예상 난이도

Easy

## 관련 파일

- `apps/backend/src/auth/auth.controller.ts`
- `apps/backend/src/common/guards/admin.guard.ts`
- `apps/backend/src/auth/auth.controller.spec.ts`

## 선행 작업

없음

### [인증/인가 개선] 결제 승인 시 내부 paymentKey 교차 검증 추가

## 배경

결제 승인 요청은 사용자 소유 주문과 외부 결제 ID가 모두 일치해야 합니다.

## 현재 문제

`NaverPayService.approvePayment()`가 입력 `paymentId`와 주문에 저장된 `payment.paymentKey`의 일치 여부를 명시적으로 확인하지 않습니다.

## 개선 방향

승인 요청 전 내부 저장 payment key와 요청 payment id를 비교합니다.

## 작업 범위

- [ ] Naver Pay 승인 전 paymentKey 검증 추가
- [ ] 불일치 시 400 또는 403 반환
- [ ] 결제 서비스 테스트 추가

## 완료 조건

- [ ] 다른 paymentId로 승인 시도가 실패한다
- [ ] 정상 paymentId 승인 흐름은 유지된다
- [ ] 테스트에서 IDOR 회귀를 방지한다

## 우선순위

Medium

## 예상 난이도

Easy

## 관련 파일

- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/payments/naver-pay.service.spec.ts`

## 선행 작업

없음

## 백엔드 구조 개선

### [백엔드 구조 개선] 운영 필수 환경 변수 검증 모듈 추가

## 배경

JWT, 결제, OAuth, AWS 설정이 누락되어도 일부 코드가 placeholder 또는 빈 문자열로 동작할 수 있습니다.

## 현재 문제

`JWT_SECRET`, `STRIPE_SECRET_KEY`, OAuth secret 등 필수 값 검증이 분산되어 있습니다.

## 개선 방향

ConfigModule에 환경 변수 schema validation을 추가합니다.

## 작업 범위

- [ ] 환경 변수 validation schema 작성
- [ ] production 필수 변수 목록 정의
- [ ] 누락 시 앱 부팅 실패 처리

## 완료 조건

- [ ] production에서 필수 secret 누락 시 서버가 시작되지 않는다
- [ ] development 기본값 정책이 명확하다
- [ ] 설정 테스트 또는 문서가 추가된다

## 우선순위

High

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/app.module.ts`
- `apps/backend/src/auth/auth.module.ts`
- `apps/backend/src/payments/payments.module.ts`
- `.env.example`

## 선행 작업

운영 필수 환경 변수 목록 확정

### [백엔드 구조 개선] API 응답 DTO와 내부 Prisma 타입 분리

## 배경

Prisma 모델을 그대로 반환하면 민감 필드나 내부 구조가 API에 노출될 위험이 있습니다.

## 현재 문제

일부 controller/service가 `User`, `Order`, `Product` Prisma 타입을 그대로 응답합니다.

## 개선 방향

응답 DTO 또는 select mapper를 도입해 API 계약을 명시합니다.

## 작업 범위

- [ ] 사용자 응답 DTO 우선 분리
- [ ] 관리자 응답 DTO 분리
- [ ] 주문/결제 응답 필드 검토

## 완료 조건

- [ ] 민감 필드가 API 응답에 포함되지 않는다
- [ ] Swagger 문서의 응답 구조가 명확해진다
- [ ] 기존 프론트 API 타입과 호환된다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/admin/admin.service.ts`
- `apps/backend/src/users/users.service.ts`
- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/src/payments/payments.service.ts`

## 선행 작업

관리자 사용자 목록 민감 필드 제거

## 프론트엔드 구조 개선

### [프론트엔드 구조 개선] 정적 export 환경의 인증 라우팅 전략 재정의

## 배경

현재 프론트 배포는 S3/CloudFront 정적 export인데 인증 제어는 Next middleware에 의존합니다.

## 현재 문제

정적 export 환경에서 `middleware.ts`가 실행되지 않을 가능성이 큽니다.

## 개선 방향

정적 배포 유지 시 클라이언트 Guard와 CloudFront 레벨 접근 제어를 도입하거나, 동적 Next 호스팅으로 전환합니다.

## 작업 범위

- [ ] 현재 production 배포 방식에서 middleware 동작 검증
- [ ] 인증 라우팅 전략 결정
- [ ] admin/auth 페이지 보호 방식 구현

## 완료 조건

- [ ] 비로그인 사용자의 보호 페이지 접근이 차단된다
- [ ] 일반 사용자의 `/admin` 접근이 차단된다
- [ ] 배포 환경에서 재현 테스트가 문서화된다

## 우선순위

High

## 예상 난이도

Hard

## 관련 파일

- `apps/frontend/src/middleware.ts`
- `apps/frontend/next.config.ts`
- `.github/workflows/cd-frontend.yml`
- `apps/frontend/src/app/admin/AdminGuard.tsx`

## 선행 작업

배포 방식 결정

### [프론트엔드 구조 개선] 인증 상태 관리와 API refresh 흐름 통합

## 배경

현재 로그인 페이지, register 페이지, pending 페이지, Axios interceptor가 각자 cookie를 다룹니다.

## 현재 문제

토큰 저장/삭제/refresh 로직이 여러 파일에 흩어져 있습니다.

## 개선 방향

인증 상태 관리 모듈을 만들고 cookie 조작과 redirect 정책을 한곳에 모읍니다.

## 작업 범위

- [ ] auth client 유틸 또는 store 추가
- [ ] 로그인/register/pending의 cookie 처리 통합
- [ ] refresh 실패 처리 통합

## 완료 조건

- [ ] 토큰 처리 코드 중복이 줄어든다
- [ ] refresh 실패 시 일관되게 로그아웃 처리된다
- [ ] 관련 프론트 테스트가 통과한다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/frontend/src/lib/api/client.ts`
- `apps/frontend/src/app/login/page.tsx`
- `apps/frontend/src/app/register/page.tsx`
- `apps/frontend/src/app/pending/page.tsx`

## 선행 작업

Access Token 저장 방식 결정

## API 설계 개선

### [API 설계 개선] 공개 상품 API와 관리자 상품 API 분리

## 배경

상품 조회 API가 고객 화면과 관리자 화면에서 함께 사용됩니다.

## 현재 문제

`/api/products`가 `isActive` 필터를 받을 수 있어 API 의도가 혼재되어 있습니다.

## 개선 방향

고객 공개 API는 active 상품만 반환하고, 비활성 상품 포함 조회는 `/api/admin/products` 또는 관리자 전용 query로 분리합니다.

## 작업 범위

- [ ] 공개 상품 조회 정책 정의
- [ ] 관리자 상품 조회 endpoint 설계
- [ ] 프론트 admin API 호출 경로 조정

## 완료 조건

- [ ] 일반 사용자는 비활성 상품을 조회할 수 없다
- [ ] 관리자는 비활성 상품을 관리할 수 있다
- [ ] 기존 상품 목록/관리 화면이 정상 동작한다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/products/products.controller.ts`
- `apps/backend/src/products/products.service.ts`
- `apps/frontend/src/lib/api/products.ts`
- `apps/frontend/src/lib/api/admin-products.ts`

## 선행 작업

상품 공개 정책 확정

### [API 설계 개선] API 에러 메시지 표준화

## 배경

현재 일부 에러 메시지가 내부 ID나 외부 결제 오류를 그대로 포함합니다.

## 현재 문제

예외 메시지가 서비스마다 다르고, 정보 노출 정도가 균일하지 않습니다.

## 개선 방향

클라이언트용 메시지와 서버 로그용 상세 정보를 분리합니다.

## 작업 범위

- [ ] 공통 에러 응답 포맷 정의
- [ ] 상품/주문/결제 주요 에러 메시지 정리
- [ ] trace id 또는 request id 포함 검토

## 완료 조건

- [ ] 클라이언트 응답에 내부 식별자가 불필요하게 노출되지 않는다
- [ ] 서버 로그에는 디버깅 가능한 상세 정보가 남는다
- [ ] 주요 API 테스트가 갱신된다

## 우선순위

Low

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/products/products.service.ts`
- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/main.ts`

## 선행 작업

없음

## DB/데이터 모델 개선

### [DB/데이터 모델 개선] 결제/환불 이벤트 멱등성 키 저장 구조 추가

## 배경

결제 webhook과 환불 요청은 중복 호출될 수 있습니다.

## 현재 문제

Stripe/Naver/Kakao 결제 이벤트에 대한 idempotency/event 기록 테이블이 보이지 않습니다.

## 개선 방향

외부 결제 이벤트 ID 또는 gateway transaction id를 저장해 중복 처리를 방지합니다.

## 작업 범위

- [ ] 결제 이벤트 저장 모델 설계
- [ ] Prisma migration 추가
- [ ] webhook 처리 시 중복 이벤트 무시

## 완료 조건

- [ ] 동일 webhook 재전송이 중복 상태 변경을 만들지 않는다
- [ ] 처리된 외부 이벤트를 조회할 수 있다
- [ ] webhook 테스트가 추가된다

## 우선순위

High

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/payments/payments.service.ts`
- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/payments/kakao-pay.service.ts`

## 선행 작업

결제 gateway별 event id 확인

## 테스트 추가

### [테스트 추가] 인증/인가 회귀 테스트 보강

## 배경

전역 Guard, `@Public()`, 관리자 Guard 조합이 많아 회귀 위험이 있습니다.

## 현재 문제

일부 권한 누락은 코드 리뷰만으로 발견되고 자동 테스트가 부족합니다.

## 개선 방향

주요 보호 endpoint에 대해 미인증/일반 사용자/관리자 케이스를 테스트합니다.

## 작업 범위

- [ ] 관리자 API 접근 권한 테스트 추가
- [ ] MFA API 권한 테스트 추가
- [ ] 공개 API와 보호 API 구분 테스트 추가

## 완료 조건

- [ ] 일반 사용자는 관리자 API에서 403을 받는다
- [ ] 미인증 사용자는 보호 API에서 401을 받는다
- [ ] 공개 API는 의도대로 접근 가능하다

## 우선순위

High

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/auth/auth.controller.spec.ts`
- `apps/backend/src/common/guards/admin.guard.spec.ts`
- `apps/backend/src/admin/admin.service.spec.ts`

## 선행 작업

관리자 MFA Guard 적용

### [테스트 추가] 보안 취약점 재현 테스트 추가

## 배경

민감 필드 노출, XSS, 파일 업로드, IDOR는 수정 후 회귀 방지가 중요합니다.

## 현재 문제

취약점별 회귀 테스트가 체계적으로 묶여 있지 않습니다.

## 개선 방향

보안 회귀 테스트를 서비스/컨트롤러 단위로 추가합니다.

## 작업 범위

- [ ] 관리자 사용자 목록 민감 필드 미노출 테스트
- [ ] HTML sanitize 테스트
- [ ] 파일 magic number 검증 테스트

## 완료 조건

- [ ] 알려진 취약 시나리오가 테스트로 고정된다
- [ ] `pnpm --filter @yueeroom/backend test`가 통과한다
- [ ] 프론트 XSS 렌더 테스트가 통과한다

## 우선순위

Medium

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/admin/admin.service.spec.ts`
- `apps/backend/src/products/products.service.spec.ts`
- `apps/backend/src/files/files.service.spec.ts`
- `apps/frontend/src/components/products/ProductDetailContent.test.tsx`

## 선행 작업

각 보안 수정 이슈

## 배포/운영 개선

### [배포/운영 개선] pnpm audit를 CI 보안 게이트로 추가

## 배경

`pnpm audit --prod` 결과 High 19개, Moderate 23개, Low 5개 취약점이 확인되었습니다.

## 현재 문제

CI에 의존성 취약점 게이트가 없습니다.

## 개선 방향

CI에 audit job을 추가하고 허용 기준을 정의합니다.

## 작업 범위

- [ ] CI workflow에 `pnpm audit --prod` job 추가
- [ ] severity fail 기준 정의
- [ ] 예외 처리 정책 문서화

## 완료 조건

- [ ] High 이상 취약점이 있으면 CI가 실패한다
- [ ] 예외 advisory는 명시적으로 관리된다
- [ ] 보안 점검 결과가 PR에서 확인 가능하다

## 우선순위

High

## 예상 난이도

Easy

## 관련 파일

- `.github/workflows/ci.yml`
- `pnpm-lock.yaml`
- `package.json`

## 선행 작업

현재 취약 의존성 업데이트 계획 수립

### [배포/운영 개선] 운영 Swagger 문서 접근 제한

## 배경

Swagger가 운영에서도 `/api/docs`로 노출될 가능성이 있습니다.

## 현재 문제

`main.ts`에서 환경별 Swagger 활성화 조건이 없습니다.

## 개선 방향

production에서는 Swagger를 비활성화하거나 관리자 인증/Basic Auth 뒤에 둡니다.

## 작업 범위

- [ ] Swagger 활성화 환경 조건 추가
- [ ] staging/production 정책 분리
- [ ] 운영 health check 영향 확인

## 완료 조건

- [ ] production에서 `/api/docs`가 공개 노출되지 않는다
- [ ] development에서는 기존처럼 문서 확인 가능하다
- [ ] 배포 문서에 정책이 반영된다

## 우선순위

Medium

## 예상 난이도

Easy

## 관련 파일

- `apps/backend/src/main.ts`
- `.github/workflows/cd-backend.yml`

## 선행 작업

운영 문서 접근 정책 결정

## 성능 개선

### [성능 개선] 페이지네이션 limit 상한 일관 적용

## 배경

일부 목록 API는 `limit` 상한이 없습니다.

## 현재 문제

상품, 주문, 관리자 주문 query DTO에서 `@Min(1)`은 있지만 `@Max`가 없는 경우가 있습니다.

## 개선 방향

목록 API에 합리적인 `limit` 상한을 적용합니다.

## 작업 범위

- [ ] 상품 목록 limit 상한 추가
- [ ] 주문 목록 limit 상한 추가
- [ ] 관리자 주문 목록 limit 상한 추가

## 완료 조건

- [ ] 과도한 limit 요청이 400으로 거부된다
- [ ] 기본 페이지네이션 동작이 유지된다
- [ ] DTO 테스트 또는 e2e 케이스가 추가된다

## 우선순위

Medium

## 예상 난이도

Easy

## 관련 파일

- `apps/backend/src/products/dto/product-query.dto.ts`
- `apps/backend/src/orders/dto/get-orders-query.dto.ts`
- `apps/backend/src/admin/dto/get-admin-orders-query.dto.ts`

## 선행 작업

API별 최대 page size 결정

## 코드 품질 개선

### [코드 품질 개선] 결제 provider별 공통 인터페이스 정리

## 배경

Stripe, Naver Pay, Kakao Pay 처리 로직이 서비스별로 분산되어 있고 주문/환불 서비스가 provider별 분기를 직접 가집니다.

## 현재 문제

`OrdersService.processGatewayRefund()`가 결제 수단 문자열에 따라 각 provider 서비스를 직접 호출합니다.

## 개선 방향

결제 provider adapter 인터페이스를 정의하고 refund/approve 책임을 분리합니다.

## 작업 범위

- [ ] 결제 provider 인터페이스 정의
- [ ] refund 호출 로직 adapter로 이동
- [ ] 기존 provider 테스트 유지/보강

## 완료 조건

- [ ] `OrdersService`의 provider별 switch가 줄어든다
- [ ] 기존 결제/환불 테스트가 통과한다
- [ ] 새 결제 수단 추가 지점이 명확해진다

## 우선순위

Low

## 예상 난이도

Medium

## 관련 파일

- `apps/backend/src/orders/orders.service.ts`
- `apps/backend/src/payments/payments.service.ts`
- `apps/backend/src/payments/naver-pay.service.ts`
- `apps/backend/src/payments/kakao-pay.service.ts`

## 선행 작업

결제 이벤트 멱등성 구조 검토
