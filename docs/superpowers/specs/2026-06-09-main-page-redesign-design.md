# 메인 페이지 디자인 개선 설계 문서

**날짜:** 2026-06-09  
**상태:** 승인됨

---

## 목표

cafe24 레퍼런스 쇼핑몰 스타일을 참고하여 유이룸 Next.js 메인 페이지의 레이아웃과 시각적 품질을 높인다. 에디토리얼 그리드 구조로 전환하고, 불필요한 섹션을 제거하며, 상품 탐색 UX를 개선한다.

---

## 현재 상태

`apps/frontend/src/app/(auth)/page.tsx` 는 아래 3개 컴포넌트를 순서대로 렌더링한다:

1. `MainBanner` — 인디고 그라디언트 배경 + 브랜드 텍스트 + CTA 버튼
2. `CategoryQuickLinks` — 카테고리별 이모지 아이콘 원형 그리드
3. `NewArrivals` — 4열 상품 카드 그리드 (`useNewArrivals` 훅 사용)

헤더 아이콘은 현재 이모지(`👤 🛒 🔍`) 형태이다.

---

## 변경 범위

### 제거

| 대상                          | 이유                                             |
| ----------------------------- | ------------------------------------------------ |
| `MainBanner` 컴포넌트         | `EditorialHero`로 대체                           |
| `CategoryQuickLinks` 컴포넌트 | 헤더 네비게이션에 이미 카테고리 링크가 있어 중복 |

### 신규

#### `EditorialHero` 컴포넌트

`apps/frontend/src/components/home/EditorialHero.tsx`

- **레이아웃:** 좌 3/5 히어로 이미지 + 우 2/5 신상품 카드 2개 (스택)
- **히어로 이미지:** `/public/banner.jpg` (정적 파일, 교체 시 파일 교체 후 재배포)
  - 이미지 없을 경우 인디고 그라디언트 폴백 표시
- **우측 카드:** `useNewArrivals` 훅의 상위 2개 상품 사용 (상품명, 브랜드명(`product.brand?.name`), 가격, 썸네일)
- **높이:** `h-[300px]` (데스크탑), 모바일에서는 세로 스택으로 전환
- **브랜드 텍스트 오버레이:** "New Collection" 캡션 + "유이룸" 타이틀 + "상품 보기 →" CTA

#### 헤더 아이콘 변경

`apps/frontend/src/components/layout/Header.tsx`

- 이모지 아이콘 → 라인 SVG 아이콘으로 교체
  - 유저: person outline SVG
  - 장바구니: shopping bag outline SVG
  - 검색: magnifying glass outline SVG
- stroke-width: 1.5, 크기: 18×18

### 변경

#### `NewArrivals` 컴포넌트

`apps/frontend/src/components/home/NewArrivals.tsx`

| 항목            | 현재            | 변경 후                                   |
| --------------- | --------------- | ----------------------------------------- |
| 열 수           | 4열             | 5열                                       |
| 초기 표시 행 수 | 전체            | 6행 (30개)                                |
| 카드 비율       | `aspect-square` | `aspect-[4/5]`                            |
| 브랜드명 표시   | 없음            | `product.brand?.name` — 없으면 빈 줄 생략 |
| 더보기          | 없음            | MORE 버튼 (6행씩 추가)                    |

**MORE 버튼 동작:**

- `visibleCount` 상태값으로 클라이언트 사이드에서 관리
- 초기값: 30 (5열 × 6행)
- MORE 클릭 시: `visibleCount += 30`
- 전체 상품 수 ≤ `visibleCount`이면 MORE 버튼 숨김
- 페이지네이션 없이 단일 API 호출로 전체 데이터 수신 후 슬라이싱

#### `page.tsx` 레이아웃

`apps/frontend/src/app/(auth)/page.tsx`

- `CategoryQuickLinks` 제거
- `MainBanner` → `EditorialHero` 교체
- body 좌우 여백: `px-[10%]` (전체 페이지 너비의 10%)

---

## 컴포넌트 구조 (변경 후)

```
(auth)/page.tsx
├── EditorialHero          ← 신규 (MainBanner 대체)
│   └── useNewArrivals     ← 상위 2개 상품만 사용
└── NewArrivals            ← 기존, 스타일 및 기능 변경
    └── useNewArrivals     ← 전체 상품, visibleCount 슬라이싱
```

**데이터 중복 주의:** `EditorialHero`와 `NewArrivals` 모두 `useNewArrivals`를 호출한다. React Query 캐시로 실제 네트워크 요청은 1회만 발생하므로 문제없다.

---

## 테스트 계획

- `EditorialHero.test.tsx` 신규 작성
  - 이미지 정상 렌더링 확인
  - 상품 카드 2개 표시 확인
  - 이미지 없을 때 폴백 확인
- `NewArrivals.test.tsx` 수정
  - 5열 그리드 확인
  - MORE 버튼 클릭 시 추가 상품 표시 확인
  - 전체 표시 시 MORE 버튼 숨김 확인
- `MainBanner.test.tsx`, `CategoryQuickLinks.test.tsx` 삭제
- 헤더 아이콘 테스트는 기존 헤더 테스트에서 SVG aria-label 확인

---

## 범위 외 (다음 단계)

- 관리자 배너 이미지 업로드/관리 기능 (별도 이슈)
- 모바일 반응형 상세 최적화
- 신상품 무한 스크롤 (현재 MORE 버튼 방식으로 충분)
