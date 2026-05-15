# Phase 10 — 상품 · 관리자 UI · 버그 수정 (PR #130~145)

> Phase 10 목표: 상품 관리 어드민 고도화, 고객 상품 UX 개선

---

## PR #130 — 브랜드 관리 + 상품 옵션(variant) 빌더

**브랜치**: `feat/brand-and-variant-builder` | 병합: 2026-05-09

### 주요 변경사항

- **Prisma**: `Brand` 모델 신규, `Product.brandId` optional 추가, migration 적용
- **Backend**: `BrandsModule` (GET @Public, POST/DELETE @Roles(ADMIN))
- **Admin FE**: Admin Sidebar 브랜드 관리 탭, `/admin/brands` CRUD 페이지
- **상품 등록 폼**: `TagInput`(사이즈/색상) + variant 자동 조합 빌더 (개별 가격·SKU 수정 가능)

---

## PR #132 — 어드민 상품 수정 모달 variant 관리

**브랜치**: `feat/admin-variant-visibility` | 병합: 2026-05-09 이후

- 상품 수정 모달에 기존 variant 목록 표시
- variant 추가/삭제 기능
- 상품 상세 옵션 선택 UX 개선
- gemini 리뷰 수용: `formatPrice` 적용, `mapRowsToPayloads` 헬퍼 추출, 삭제 확인 추가

---

## PR #133 — 상품+variant 단일 트랜잭션 생성 (#131)

**브랜치**: `feature/phase10-issue131-product-variant-transaction` | 병합: 2026-05-09 이후

- 기존 `Promise.all` 방식 → 단일 `$transaction` 으로 원자성 보장
- gemini 리뷰 수용: 중첩 create로 트랜잭션 단순화

---

## PR #134 — 바로 주문 기능

**브랜치**: `feature/phase10-buy-now` | 병합: 2026-05-11

- `cart` Zustand store에 `buyNow` 상태 추가 (`partialize`로 localStorage 제외)
- 상세페이지 버튼: [장바구니 담기] / [바로 주문하기(full-width)]
- `CheckoutContent`: `buyNow` 있을 때 단건 상품으로 결제, `useEffect` cleanup으로 이탈 시 자동 초기화
- gemini 리뷰 수용: `partialize`, `clearOrderState` 헬퍼, `useEffect` cleanup

---

## PR #135 — 네이버페이 결제 방법 변경 불가 버그 수정

**브랜치**: `fix/checkout-naverpay-fallback` | 병합: 2026-05-13

- `NaverPayButton`: `!isProcessing` 시 "다른 결제 방법으로 변경" 버튼 항상 표시
- `pendingOrderId` 도입: 결제 방법 변경 후 재시도 시 주문 중복 생성 방지
- 배송지(`resolvedAddressId`) 변경 시 `pendingOrderId` 초기화 (데이터 불일치 방지)

---

## PR #136 — Header 인증 상태 표시

**브랜치**: `feature/phase10-header-user-menu` | 병합: 2026-05-13

- 미인증 → 로그인 버튼 표시 (`/login` 링크)
- 인증됨 → 사용자 이름 + 드롭다운 (마이페이지·로그아웃)
- 로그아웃: `POST /auth/logout` + 쿠키 삭제 + `queryClient.clear()` + `/login` 리다이렉트
- `UserMenu` Client Component 신규, `Header`는 Server Component 유지

---

## PR #137 — 상품 이미지 관리 UI + HTML 편집기

**브랜치**: `feature/phase10-product-image-editor` | 병합: 2026-05-14

- **`ProductImageManager`**: 3열 이미지 그리드, "대표" 배지, 업로드/삭제 (`useUploadImage`·`useDeleteImage` 훅 재사용)
- **`RichTextEditor`**: TipTap HTML 편집기 (Bold·Italic·Underline·H2·H3·목록·링크·이미지 삽입)
- 상품 등록 후 수정 모달 자동 전환 (즉시 이미지 추가 가능)
- `description` `<textarea>` → `RichTextEditor` 교체
- 백엔드 변경 없음 — 기존 `POST /products/:productId/images` 재사용
- 패키지 추가: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-underline`
- TipTap v3 `StarterKit` 중복 경고: `StarterKit.configure({ underline: false, link: false })`

---

## PR #138 — 상품 상세 페이지 UI 개선

**브랜치**: `feature/phase10-product-detail-ui` | 병합: 2026-05-14

- **ImageGallery**: 대표 이미지(`images[0]`)만 표시, 썸네일 캐러셀 제거
- **ProductDetailContent**: `description`을 `sanitize-html`로 sanitize 후 `dangerouslySetInnerHTML`
- 추가 이미지(`images.slice(1)`)를 상세 섹션 하단에 순서대로 전체 너비 표시
- **빌드 오류 수정**: `isomorphic-dompurify`(jsdom 의존) → `sanitize-html`(순수 Node.js) — Next.js 정적 export prerender 오류 해결
- 주의: main 직접 푸시 실수 → revert + feature 브랜치 재생성 후 PR 정상 등록

---

## PR #139 — 어드민 상품 등록 직후 이미지 업로드 UI

**브랜치**: `feature/phase10-admin-product-image-on-create` | 병합: 2026-05-14

- `isPostCreate` 상태: 상품 등록 성공 후 edit 모달 전환 시 이미지 섹션 초록 강조 + 안내 문구
- `useRef` + `useEffect`로 이미지 섹션 자동 스크롤 (smooth)
- 하단 버튼 분기: post-create → "나중에 추가 / 완료(=handleSubmit)", create → "취소 / 등록", edit → "취소 / 저장"

---

## PR #140 — 상품 등록 SKU 중복 500 → 409 수정

**브랜치**: `fix/product-create-sku-conflict` | 병합: 2026-05-14

- `ProductsService.create()`에 P2002 에러 핸들링 누락 → 500 반환 문제 수정
- `Prisma.PrismaClientKnownRequestError` + `e.meta?.target?.includes('sku')` → 409 ConflictException
- `variants.service.ts` create/update에도 동일 패턴 일관 적용 (gemini 리뷰 수용)

---

## 인프라 핫픽스 (2026-05-14, PR 없이 직접 적용)

### 이미지 업로드 500 오류

- **원인**: `S3_BUCKET_NAME`, `CDN_URL` ECS 환경변수 미등록
- **수정**: `ecs.tf` environment 블록에 추가 → terraform apply → ECS 롤링 배포 (revision 84)

### CSP img-src 오류

- **원인**: `img-src 'self' data:'`에 `https://assets.yueeroom.com` 미허용
- **수정**: `cloudfront.tf` img-src에 `https://assets.${var.domain}` 추가 → terraform apply

---

## PR #141 — 어드민 상품 등록/수정 에러 메시지 표시

**브랜치**: `fix/admin-product-create-error-display` | 병합: 2026-05-15

- 상품 등록/수정 API 에러 메시지를 모달로 표시
- gemini 리뷰 수용: 에러 메시지 배열 처리 + variant 에러 핸들링

---

## PR #142 — 상품 코드 기반 전역 고유 SKU

**브랜치**: `feature/sku-product-code` | 병합: 2026-05-15

### 변경 이유

기존 `{SIZE}-{COLOR}` SKU는 다른 상품에 같은 사이즈/색상이 있으면 전역 고유 제약(`@unique`) 충돌 발생.

### 주요 변경사항

- `Product.productCode` 필드 추가 (포맷: `PRD000001`, 백엔드 자동 생성)
- SKU 포맷 변경: `{productCode}-{SIZE}-{COLOR}`
- 마이그레이션 `20260514000000_add_product_code`: 기존 상품 backfill 포함
- PostgreSQL 호환: `UPDATE`에서 CTE로 윈도우 함수 이동
- **주의**: 프론트엔드 variant 생성 시 `sku` 필드를 payload에 포함하지 않음 (백엔드 생성)

---

## PR #143 — 상품 리스트 대표 이미지 표시

**브랜치**: `feature/product-list-thumbnail` | 병합: 2026-05-15

### 변경 이유

`ProductsService.findAll()` Prisma 쿼리에 `images` 관계 누락으로 API 응답에 images 배열 없음.

### 주요 변경사항

- `listInclude` 클래스 상수 추출 → cursor/offset 두 쿼리에 공통 적용
- `images`: `take: 1, select: { url: true }`로 대표 이미지 URL만 조회

---

## PR #144 — 상품 삭제 FK 제약 위반 500 에러 수정

**브랜치**: `fix/product-delete-fk-constraint` | 병합: 2026-05-15

### 변경 이유

`CartItem.variant`, `OrderItem.variant`, `Review.product`에 `onDelete` 규칙 없어 cascade 삭제 시 FK 제약 위반.

### 주요 변경사항 (스키마 마이그레이션 없음, 서비스 레이어 처리)

- 주문 내역 있는 상품 → 409 ConflictException ("비활성화만 가능합니다")
- `CartItem`·`Review`는 `$transaction` 내에서 삭제 전 정리
- `hasOrders` 확인과 images 조회를 `Promise.all`로 병렬 처리
- S3 파일 삭제는 DB 트랜잭션 완료 후 실행 (DB 실패 시 이미지 소실 방지)

---

## PR #145 — 관리자 상품 리스트에 비활성화 상품 표시

**브랜치**: `fix/admin-show-inactive-products` | 병합: 2026-05-15

### 변경 이유

`findAll()`의 `isActive ?? true` 기본값으로 인해 관리자도 비활성 상품을 볼 수 없었음.

### 주요 변경사항

- `findAll()`: `isActive` 미전달 시 필터 없이 전체 반환, 명시 시 해당 값으로 필터
- 공개 API (`getProducts`, `getNewArrivals`): `isActive: true` 명시 → 기존 동작 유지
- 관리자 API (`adminGetProducts`): 파라미터 없이 호출 → 전체 반환
- `search()`: `Prisma.empty` 활용해 `isActive` 선택적 필터 (`SearchProductDto`에 `isActive` 추가)
