# 유이룸 (Yu-ee Room) 개발 로드맵

> 유아/아동복 및 악세사리 온라인 쇼핑몰  
> 완전 비공개 운영 (관리자 승인 기반 회원제)  
> 최종 업데이트: 2026-04-10

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [확정 기술 스택](#2-확정-기술-스택)
3. [개발 원칙](#3-개발-원칙)
4. [인프라 아키텍처](#4-인프라-아키텍처)
5. [CI/CD 파이프라인](#5-cicd-파이프라인)
6. [개발 로드맵](#6-개발-로드맵)
7. [브랜치 전략](#7-브랜치-전략)
8. [보안 정책](#8-보안-정책)

---

## 1. 서비스 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | 유이룸 (Yu-ee Room) |
| 카테고리 | 유아/아동복 및 악세사리 온라인 쇼핑몰 |
| 운영 방식 | 완전 비공개 (회원제) |
| 회원가입 | 신청 후 관리자 승인 필수 |
| 상품 열람 | 승인된 회원만 가능 (비회원 접근 전면 차단) |
| 타겟 시장 | 한국 |

### 회원 상태 구조

```
미인증 사용자  →  가입 신청  →  PENDING (승인 대기)
                                    ↓ 관리자 검토
                              APPROVED (정상 이용)
                              REJECTED (가입 거절)
                              SUSPENDED (이용 정지)
```

---

## 2. 확정 기술 스택

### 프론트엔드

| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 14+ (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 + shadcn/ui |
| 클라이언트 상태 | Zustand |
| 서버 상태 | TanStack Query |
| 단위/통합 테스트 | Vitest + React Testing Library |
| E2E 테스트 | Playwright |

### 백엔드

| 항목 | 기술 |
|---|---|
| 프레임워크 | NestJS 10+ |
| 언어 | TypeScript |
| ORM | Prisma |
| 인증 | Passport.js + JWT + bcrypt |
| 단위/통합 테스트 | Jest + Supertest |

### 데이터베이스

| 항목 | 기술 |
|---|---|
| 메인 DB | AWS RDS PostgreSQL 15+ |
| 캐시 | AWS ElastiCache Redis 7+ |

### 결제

| 항목 | 기술 |
|---|---|
| 글로벌 | Stripe |
| 국내 | Naver Pay + KakaoPay |

### AWS 인프라

| 역할 | 서비스 |
|---|---|
| 프론트엔드 배포 | S3 + CloudFront |
| 백엔드 배포 | ECS Fargate (Docker) |
| Docker 이미지 저장소 | ECR |
| 데이터베이스 | RDS PostgreSQL |
| 캐시 | ElastiCache Redis |
| 파일 스토리지 | S3 |
| 이메일 발송 | SES (가입 승인 알림) |
| SSL 인증서 | ACM |
| 모니터링 | CloudWatch + Sentry |
| 권한 관리 | IAM (최소 권한 원칙) |

### CI/CD

| 항목 | 기술 |
|---|---|
| 플랫폼 | GitHub Actions |

---

## 3. 개발 원칙

### TDD (Test-Driven Development)

모든 기능은 테스트 우선 방식으로 개발한다.

```
1. 실패하는 테스트 작성 (Red)
2. 테스트를 통과하는 최소한의 코드 작성 (Green)
3. 코드 리팩터링 (Refactor)
```

- 백엔드: Jest 기반 단위/통합 테스트
- 프론트엔드: Vitest + React Testing Library
- E2E: Playwright (주요 구매 흐름 필수 커버)
- PR Merge 조건: 모든 테스트 통과 필수

### 코드 품질

- ESLint + Prettier 강제 적용 (pre-commit hook)
- TypeScript strict 모드
- PR 단위 코드 리뷰

---

## 4. 인프라 아키텍처

```
사용자 브라우저
      │
      ▼
 CloudFront (CDN + WAF)
      │
   ┌──┴──────────────────┐
   │                     │
   ▼                     ▼
S3 버킷               ECS Fargate
(Next.js 빌드)        (NestJS API)
                         │
                    ┌────┴────┐
                    ▼         ▼
              RDS             ElastiCache
           PostgreSQL           Redis
                    │
                    ▼
                   S3
              (이미지 스토리지)
                    │
                    ▼
                   SES
              (이메일 발송)
```

### 환경 분리

| 환경 | 브랜치 | 용도 |
|---|---|---|
| Production | `main` | 실 서비스 |

---

## 5. CI/CD 파이프라인

### Workflow 1 — CI (PR 생성/업데이트 시)

```
PR 생성 또는 커밋 푸시
         │
   ┌─────┴─────┐
   ▼           ▼
Lint &      Unit &
Type Check  Integration Test
   │           │
   └─────┬─────┘
         ▼
       Build
       성공 확인
         │
         ▼
    모두 통과 시
   PR Merge 가능
```

### Workflow 2 — CD Backend (main 병합 시)

```
main 병합
    │
    ▼
Docker 이미지 빌드
    │
    ▼
AWS ECR Push
    │
    ▼
ECS Fargate Rolling Update
    │
    ▼
Prisma 마이그레이션 실행
    │
    ▼
CloudWatch 헬스체크 확인
```

### Workflow 3 — CD Frontend (main 병합 시)

```
main 병합
    │
    ▼
Next.js Build
    │
    ▼
S3 버킷 업로드
    │
    ▼
CloudFront 캐시 Invalidation
    │
    ▼
배포 완료
```

---

## 6. 개발 로드맵

### Phase 1 — 프로젝트 기반 구축

**목표:** 개발 환경 통일, 코드 품질 기반 마련

- [ ] Monorepo 구조 설정 (`apps/frontend`, `apps/backend`, `packages/shared`)
- [ ] Next.js 프로젝트 초기화 (TypeScript, Tailwind CSS v4, shadcn/ui)
- [ ] NestJS 프로젝트 초기화 (TypeScript, Prisma)
- [ ] TDD 환경 설정 (Jest, Vitest, Playwright)
- [ ] Docker Compose 로컬 개발 환경 (PostgreSQL + Redis)
- [ ] ESLint + Prettier + Husky (pre-commit hook) 설정
- [ ] GitHub Actions CI 기본 파이프라인 구성
- [ ] 환경변수 구조 설계 및 `.env.example` 문서화
- [ ] AWS 계정 구조 설계 (IAM, 환경 분리)

---

### Phase 2 — DB 스키마 설계 & 인증 시스템

**목표:** 핵심 데이터 구조 확립, 비공개 서비스에 맞는 회원 인증 시스템 구축

**DB 스키마:**
```
users            회원 (상태: PENDING / APPROVED / REJECTED / SUSPENDED)
addresses        배송지
children_profiles 자녀 정보 (사이즈, 선호도)
categories       카테고리
products         상품
product_variants 상품 변형 (사이즈, 색상, SKU)
inventory        재고
orders           주문
order_items      주문 상품
payments         결제 (카드 정보 직접 저장 금지 - 토큰화)
refunds          환불
reviews          후기
wishlists        위시리스트
carts            장바구니
cart_items       장바구니 상품
```

**구현 항목:**
- [ ] Prisma 스키마 설계 및 초기 마이그레이션
- [ ] 이메일 회원가입 신청 API (PENDING 상태로 생성)
- [ ] 관리자 승인/거절 API
- [ ] 승인 결과 이메일 발송 (AWS SES)
- [ ] 로그인 API (JWT + Passport.js, APPROVED 상태만 허용)
- [ ] 네이버 / 카카오 소셜 로그인
- [ ] 토큰 갱신 (Refresh Token)
- [ ] 비밀번호 재설정
- [ ] 관리자 계정 MFA (2단계 인증)
- [ ] 미인증 접근 전면 차단 미들웨어
- [ ] 전 기능 TDD 적용

---

### Phase 3 — 상품 & 카테고리 시스템

**목표:** 상품 관리 핵심 로직 완성

- [ ] 카테고리 / 서브카테고리 CRUD API
- [ ] 상품 CRUD API (이름, 설명, 가격, 이미지)
- [ ] 상품 변형 관리 (사이즈, 색상, SKU)
- [ ] 재고 수량 관리 및 부족 알림
- [ ] 이미지 업로드 (AWS S3 연동)
- [ ] 상품 검색 API (PostgreSQL 전체 텍스트 검색)
- [ ] 상품 필터링 / 정렬 API
- [ ] 전 기능 TDD 적용

---

### Phase 4 — 프론트엔드 핵심 UI

**목표:** 로그인/가입신청 외 모든 페이지 인증 필수 구조로 구현

**공개 페이지 (비회원 접근 가능):**
- [ ] 로그인 페이지
- [ ] 회원가입 신청 페이지
- [ ] 승인 대기 안내 페이지

**인증 페이지 (APPROVED 회원만 접근):**
- [ ] 공통 레이아웃 (헤더, 푸터, 모바일 네비게이션)
- [ ] 홈페이지 (배너, 신상품, 카테고리 퀵링크)
- [ ] 상품 목록 페이지 (필터링, 정렬, 페이지네이션)
- [ ] 상품 상세 페이지 (이미지 갤러리, 사이즈 선택, 사이즈 가이드)
- [ ] 마이페이지 (프로필, 자녀 정보 등록)
- [ ] 미인증 전체 라우트 리다이렉트 처리

---

### Phase 5 — 쇼핑 기능

**목표:** 구매 흐름 완성

- [ ] 장바구니 (Zustand 기반, 비로그인 임시 저장 → 로그인 시 동기화)
- [ ] 위시리스트
- [ ] 주문서 작성 / 배송지 관리
- [ ] 주문 내역 & 상세 조회
- [ ] 주문 상태 추적 (결제완료 → 배송준비 → 배송중 → 배송완료)
- [ ] TDD 적용

---

### Phase 6 — 결제 시스템

**목표:** 한국 시장 결제 완전 지원, PCI DSS 준수

- [ ] Stripe 연동 (국제 신용카드)
- [ ] Naver Pay 직접 API 연동
- [ ] KakaoPay 직접 API 연동
- [ ] 할부 결제 (5만원 이상)
- [ ] 결제 이력 관리
- [ ] 환불 / 부분환불 처리
- [ ] 카드 정보 직접 저장 금지 (토큰화 필수)
- [ ] Webhook 처리 (결제 상태 동기화)
- [ ] TDD 적용

---

### Phase 7 — 관리자 대시보드

**목표:** 운영자가 독립적으로 쇼핑몰을 관리할 수 있는 백오피스

- [ ] 회원 가입 신청 목록 & 승인/거절 처리
- [ ] 회원 정지 / 복구 관리
- [ ] 상품 등록 / 수정 / 삭제
- [ ] 주문 처리 (상태 변경, 송장 입력)
- [ ] 재고 현황 및 부족 알림
- [ ] 매출 현황 / 기본 통계 대시보드
- [ ] 승인 알림 이메일 발송 관리

---

### Phase 8 — 보안 강화

**목표:** 최종 보안 감사 및 취약점 제거

> TDD로 각 Phase에서 테스트가 이미 내재화됨. 이 Phase는 최종 보안 감사에 집중.

- [ ] OWASP Top 10 점검 (XSS, SQL Injection, CSRF 등)
- [ ] 미인증 접근 시나리오 전수 E2E 테스트
- [ ] AWS IAM 최소 권한 점검
- [ ] PCI DSS 체크리스트 검토
- [ ] 한국 개인정보보호법(PIPA) 준수 검토
- [ ] Lighthouse 점수 최적화 (성능, 접근성)
- [ ] Rate Limiting / DDoS 방어 설정 확인

---

### Phase 9 — AWS 배포 & 서비스 론칭

**목표:** 실제 서비스 오픈

- [ ] AWS 인프라 프로비저닝 (RDS, ElastiCache, S3, ECR, ECS, CloudFront, SES, ACM)
- [ ] GitHub Actions CD 파이프라인 구성
  - [ ] Backend: ECR Push → ECS Fargate Rolling Deploy
  - [ ] Frontend: Next.js Build → S3 Upload → CloudFront Invalidation
- [ ] 도메인 연결 및 SSL 인증서 설정 (ACM)
- [ ] CloudFront WAF 설정
- [ ] CloudWatch + Sentry 모니터링 연동
- [ ] Prisma 마이그레이션 자동 실행 설정
- [ ] 론칭 전 최종 체크리스트 검수

---

## 7. 브랜치 전략

```
main (production)
 └── claude/<작업명>  작업 브랜치
        └── PR 생성 → CI 자동 실행 → Approve → Merge → CD 자동 배포
```

- 모든 작업은 `main`에서 분기
- PR Merge 조건: CI 통과 + 관리자 Approve
- 직접 `main` 푸시 금지

---

## 8. 보안 정책

| 항목 | 정책 |
|---|---|
| 카드 정보 저장 | 직접 저장 금지, 토큰화 필수 |
| API 통신 | TLS 1.2 이상 필수 |
| 비밀번호 | bcrypt 해싱 |
| 관리자 계정 | MFA 필수 |
| IAM | 최소 권한 원칙 |
| 환경변수 | `.env` Git 커밋 금지 |
| 미인증 접근 | 로그인/가입신청 외 전체 차단 |
| 개인정보 | 한국 개인정보보호법(PIPA) 준수 |
