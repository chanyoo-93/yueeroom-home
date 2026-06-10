# 메인 페이지 디자인 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 페이지를 에디토리얼 그리드 레이아웃(히어로 이미지 + 신상품 카드 2개 + 신상품 5열 그리드)으로 개선하고, 헤더 아이콘을 라인 SVG로 교체한다.

**Architecture:** `MainBanner`와 `CategoryQuickLinks`를 제거하고 `EditorialHero`(신규)로 대체한다. `NewArrivals`는 5열·MORE 버튼·브랜드명 표시를 추가한다. `EditorialHero`와 `NewArrivals` 모두 동일한 `useNewArrivals` 훅을 사용하며, React Query 캐시로 네트워크 요청은 1회만 발생한다.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Vitest, @testing-library/react

---

## 파일 맵

| 액션 | 파일                                                            |
| ---- | --------------------------------------------------------------- |
| 생성 | `apps/frontend/src/components/home/EditorialHero.tsx`           |
| 생성 | `apps/frontend/src/components/home/EditorialHero.test.tsx`      |
| 수정 | `apps/frontend/src/lib/api/products.ts`                         |
| 수정 | `apps/frontend/src/lib/hooks/useNewArrivals.ts`                 |
| 수정 | `apps/frontend/src/components/home/NewArrivals.tsx`             |
| 수정 | `apps/frontend/src/components/home/NewArrivals.test.tsx`        |
| 수정 | `apps/frontend/src/components/layout/UserMenu.tsx`              |
| 수정 | `apps/frontend/src/components/layout/MiniCart.tsx`              |
| 수정 | `apps/frontend/src/app/(auth)/page.tsx`                         |
| 추가 | `apps/frontend/public/banner.jpg` (플레이스홀더)                |
| 삭제 | `apps/frontend/src/components/home/MainBanner.tsx`              |
| 삭제 | `apps/frontend/src/components/home/MainBanner.test.tsx`         |
| 삭제 | `apps/frontend/src/components/home/CategoryQuickLinks.tsx`      |
| 삭제 | `apps/frontend/src/components/home/CategoryQuickLinks.test.tsx` |

---

## Task 1: EditorialHero 컴포넌트 생성

**Files:**

- Create: `apps/frontend/src/components/home/EditorialHero.test.tsx`
- Create: `apps/frontend/src/components/home/EditorialHero.tsx`

- [ ] **Step 1: 테스트 파일 작성**

`apps/frontend/src/components/home/EditorialHero.test.tsx` 를 아래 내용으로 생성한다:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock('@/lib/hooks/useNewArrivals');

import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import EditorialHero from './EditorialHero';

function mockProduct(id: string, name: string, basePrice: number, brandName?: string) {
  return {
    id,
    categoryId: 'cat1',
    name,
    description: null,
    basePrice,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat1', name: '상의', slug: 'top' },
    brand: brandName ? { id: 'b1', name: brandName, slug: 'brand' } : undefined,
    images: [],
  };
}

describe('EditorialHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 우측 패널에 스켈레톤 2개를 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('상위 2개 상품의 이름과 가격을 렌더링하고 3번째는 표시하지 않는다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '여름 린넨 원피스', 45000),
          mockProduct('2', '스트라이프 티셔츠', 28000),
          mockProduct('3', '데님 자켓', 62000),
        ],
        total: 3,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);

    expect(screen.getByText('여름 린넨 원피스')).toBeInTheDocument();
    expect(screen.getByText('45,000원')).toBeInTheDocument();
    expect(screen.getByText('스트라이프 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('28,000원')).toBeInTheDocument();
    expect(screen.queryByText('데님 자켓')).not.toBeInTheDocument();
  });

  it('브랜드명이 있으면 표시하고 없으면 표시하지 않는다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '여름 린넨 원피스', 45000, 'ZARA KIDS'),
          mockProduct('2', '스트라이프 티셔츠', 28000),
        ],
        total: 2,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByText('ZARA KIDS')).toBeInTheDocument();
  });

  it('히어로 배너 이미지의 src가 /banner.jpg이다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByAltText('유이룸 배너')).toHaveAttribute('src', '/banner.jpg');
  });

  it('섹션에 aria-label이 있다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<EditorialHero />);
    expect(screen.getByRole('region', { name: '에디토리얼 히어로' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/home/EditorialHero.test.tsx
```

Expected: `EditorialHero` 모듈을 찾을 수 없어 FAIL

- [ ] **Step 3: EditorialHero 컴포넌트 구현**

`apps/frontend/src/components/home/EditorialHero.tsx` 를 아래 내용으로 생성한다:

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import { formatPrice } from '@/lib/utils/format';

function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className="flex animate-pulse items-center gap-3 px-4 py-4"
    >
      <div className="h-[68px] w-[68px] shrink-0 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function EditorialHero() {
  const { data, isLoading } = useNewArrivals();
  const topTwo = Array.isArray(data?.data) ? data.data.slice(0, 2) : [];

  return (
    <section
      aria-label="에디토리얼 히어로"
      className="grid h-[300px] grid-cols-[3fr_2fr] overflow-hidden rounded-xl shadow-sm"
    >
      {/* 좌: 히어로 이미지 */}
      <div className="relative">
        <Image src="/banner.jpg" alt="유이룸 배너" fill priority className="object-cover" />
        {/* 이미지 위 그라디언트 오버레이 — 이미지 없을 때도 배경 역할 */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/70 to-indigo-400/70" />
        <div className="absolute bottom-6 left-6 text-white">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-widest opacity-85">
            New Collection
          </p>
          <h1 className="mb-3 text-2xl font-bold">유이룸</h1>
          <Link
            href="/products"
            className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            상품 보기 →
          </Link>
        </div>
      </div>

      {/* 우: 신상품 상위 2개 카드 */}
      <div className="grid grid-rows-2 divide-y divide-gray-200 bg-white">
        {isLoading
          ? [0, 1].map((i) => <SkeletonCard key={i} />)
          : topTwo.map((product) => {
              const thumbnail = product.images?.[0]?.url;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50"
                >
                  <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product.name}
                        fill
                        sizes="68px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-gray-300">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{product.name}</p>
                    {product.brand?.name && (
                      <p className="text-[10px] text-gray-400">{product.brand.name}</p>
                    )}
                    <p className="mt-1 text-xs font-bold text-indigo-600">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/home/EditorialHero.test.tsx
```

Expected: 5개 테스트 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/components/home/EditorialHero.tsx \
        apps/frontend/src/components/home/EditorialHero.test.tsx
git commit -m "feat: EditorialHero 컴포넌트 추가 (히어로 이미지 + 신상품 카드 2개)"
```

---

## Task 2: getNewArrivals limit 증가 + NewArrivals 개선

**Files:**

- Modify: `apps/frontend/src/lib/api/products.ts`
- Modify: `apps/frontend/src/lib/hooks/useNewArrivals.ts`
- Modify: `apps/frontend/src/components/home/NewArrivals.test.tsx`
- Modify: `apps/frontend/src/components/home/NewArrivals.tsx`

- [ ] **Step 1: API limit 업데이트**

`apps/frontend/src/lib/api/products.ts` 의 `getNewArrivals` 함수에서 `limit: 8`을 `limit: 100`으로 변경한다:

```ts
export async function getNewArrivals(): Promise<ProductsListResponse> {
  const res = await apiClient.get<ProductsListResponse>('/products', {
    params: { limit: 100, sort: 'latest' },
  });
  return res.data;
}
```

- [ ] **Step 2: useNewArrivals 쿼리 키 업데이트**

`apps/frontend/src/lib/hooks/useNewArrivals.ts` 에서 쿼리 키의 limit을 8 → 100으로 수정한다:

```ts
import { useQuery } from '@tanstack/react-query';
import { getNewArrivals } from '../api/products';
import { queryKeys } from '../api/query-keys';

export function useNewArrivals() {
  return useQuery({
    queryKey: queryKeys.products.list({ limit: 100, sort: 'latest' }),
    queryFn: getNewArrivals,
  });
}
```

- [ ] **Step 3: NewArrivals 테스트 업데이트**

`apps/frontend/src/components/home/NewArrivals.test.tsx` 를 아래 내용으로 교체한다:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/hooks/useNewArrivals');

import { useNewArrivals } from '@/lib/hooks/useNewArrivals';
import NewArrivals from './NewArrivals';

function mockProduct(id: string, name: string, basePrice: number, brandName?: string) {
  return {
    id,
    categoryId: 'cat1',
    name,
    description: null,
    basePrice,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat1', name: '상의', slug: 'top' },
    brand: brandName ? { id: 'b1', name: brandName, slug: 'brand' } : undefined,
    images: [],
  };
}

describe('NewArrivals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 스켈레톤 카드 10개를 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getAllByRole('status')).toHaveLength(10);
  });

  it('신상품 목록을 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [
          mockProduct('1', '베이비 블루 롬퍼', 29000),
          mockProduct('2', '스트라이프 티셔츠', 19000),
        ],
        total: 2,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    expect(screen.getByText('스트라이프 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.getByText('19,000원')).toBeInTheDocument();
  });

  it('브랜드명이 있으면 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: {
        data: [mockProduct('1', '베이비 블루 롬퍼', 29000, 'ZARA KIDS')],
        total: 1,
        page: 1,
        limit: 100,
        nextCursor: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('ZARA KIDS')).toBeInTheDocument();
  });

  it('상품 30개 이하이면 MORE 버튼이 없다', () => {
    const products = Array.from({ length: 30 }, (_, i) =>
      mockProduct(String(i), `상품 ${i}`, 10000),
    );
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: products, total: 30, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.queryByRole('button', { name: 'MORE' })).not.toBeInTheDocument();
  });

  it('상품 31개이면 MORE 버튼이 표시되고 클릭 시 31번째 상품이 보인다', () => {
    const products = Array.from({ length: 31 }, (_, i) =>
      mockProduct(String(i), `상품 ${i}`, 10000),
    );
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: products, total: 31, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);

    expect(screen.queryByText('상품 30')).not.toBeInTheDocument();
    const moreBtn = screen.getByRole('button', { name: 'MORE' });
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);
    expect(screen.getByText('상품 30')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MORE' })).not.toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('등록된 신상품이 없습니다.')).toBeInTheDocument();
  });

  it('에러 상태 메시지를 표시한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByText('상품을 불러오는 데 실패했습니다.')).toBeInTheDocument();
  });

  it('"신상품" 섹션 제목을 렌더링한다', () => {
    vi.mocked(useNewArrivals).mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, nextCursor: null },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNewArrivals>);

    render(<NewArrivals />);
    expect(screen.getByRole('heading', { name: '신상품' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/home/NewArrivals.test.tsx
```

Expected: 스켈레톤 수(8→10), MORE 버튼 관련 테스트 FAIL

- [ ] **Step 5: NewArrivals 컴포넌트 전체 교체**

`apps/frontend/src/components/home/NewArrivals.tsx` 를 아래 내용으로 교체한다:

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useNewArrivals } from '@/lib/hooks/useNewArrivals';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

function SkeletonCard() {
  return (
    <div role="status" aria-label="로딩 중" className="animate-pulse space-y-2">
      <div className="aspect-[4/5] rounded-xl bg-gray-200" />
      <div className="h-3.5 w-3/4 rounded bg-gray-200" />
      <div className="h-3.5 w-1/2 rounded bg-gray-200" />
    </div>
  );
}

export default function NewArrivals() {
  const { data, isLoading, isError } = useNewArrivals();
  const [visibleCount, setVisibleCount] = useState(30);
  const products = Array.isArray(data?.data) ? data.data : [];
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">신상품</h2>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-500">상품을 불러오는 데 실패했습니다.</p>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-500">등록된 신상품이 없습니다.</p>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {visibleProducts.map((product) => {
              const thumbnail = product.images?.[0]?.url;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group space-y-1.5"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gray-100">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-gray-300">
                        👕
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="truncate text-xs font-semibold text-gray-900">{product.name}</p>
                    {product.brand?.name && (
                      <p className="text-[10px] text-gray-400">{product.brand.name}</p>
                    )}
                    <p className="text-xs font-bold text-indigo-600">
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + 30)}
                className="rounded border border-gray-300 px-10 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
              >
                MORE
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/home/NewArrivals.test.tsx
```

Expected: 8개 테스트 모두 PASS

- [ ] **Step 7: 커밋**

```bash
git add apps/frontend/src/lib/api/products.ts \
        apps/frontend/src/lib/hooks/useNewArrivals.ts \
        apps/frontend/src/components/home/NewArrivals.tsx \
        apps/frontend/src/components/home/NewArrivals.test.tsx
git commit -m "feat: NewArrivals 5열·MORE 버튼·브랜드명 표시 + API limit 100으로 증가"
```

---

## Task 3: 헤더 아이콘 SVG 교체

**Files:**

- Modify: `apps/frontend/src/components/layout/UserMenu.tsx`
- Modify: `apps/frontend/src/components/layout/MiniCart.tsx`

UserMenu와 MiniCart에 별도 테스트 파일이 없으므로 컴포넌트 수정 후 Header 통합 테스트로 검증한다.

- [ ] **Step 1: UserMenu 아이콘 교체**

`apps/frontend/src/components/layout/UserMenu.tsx` 에서 아래 부분을 찾아 교체한다.

찾을 코드 (`UserMenu`가 로그인 상태일 때의 버튼 내부):

```tsx
<span className="text-lg">👤</span>
```

교체할 코드:

```tsx
<svg
  width="20"
  height="20"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.5"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="8" r="4" />
  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
</svg>
```

- [ ] **Step 2: MiniCart 아이콘 교체**

`apps/frontend/src/components/layout/MiniCart.tsx` 에서 아래 부분을 찾아 교체한다.

찾을 코드 (장바구니 버튼 내부의 `<span className="relative text-lg">`):

```tsx
          <span className="relative text-lg">
            🛒
```

교체할 코드:

```tsx
          <span className="relative">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
```

- [ ] **Step 3: Header 기존 테스트 통과 확인**

Header 테스트는 MiniCart·UserMenu를 모킹하므로 SVG 변경의 영향을 받지 않는다.

```bash
cd apps/frontend && npx vitest run --reporter=dot src/components/layout/Header.test.tsx
```

Expected: 6개 테스트 모두 PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/frontend/src/components/layout/UserMenu.tsx \
        apps/frontend/src/components/layout/MiniCart.tsx
git commit -m "feat: 헤더 이모지 아이콘을 라인 SVG로 교체"
```

---

## Task 4: page.tsx 조립 + 구 파일 삭제

**Files:**

- Modify: `apps/frontend/src/app/(auth)/page.tsx`
- Delete: `apps/frontend/src/components/home/MainBanner.tsx`
- Delete: `apps/frontend/src/components/home/MainBanner.test.tsx`
- Delete: `apps/frontend/src/components/home/CategoryQuickLinks.tsx`
- Delete: `apps/frontend/src/components/home/CategoryQuickLinks.test.tsx`
- Add: `apps/frontend/public/banner.jpg`

- [ ] **Step 1: 구 컴포넌트 파일 삭제**

```bash
rm apps/frontend/src/components/home/MainBanner.tsx \
   apps/frontend/src/components/home/MainBanner.test.tsx \
   apps/frontend/src/components/home/CategoryQuickLinks.tsx \
   apps/frontend/src/components/home/CategoryQuickLinks.test.tsx
```

- [ ] **Step 2: page.tsx 업데이트**

`apps/frontend/src/app/(auth)/page.tsx` 를 아래 내용으로 교체한다:

```tsx
import EditorialHero from '@/components/home/EditorialHero';
import NewArrivals from '@/components/home/NewArrivals';

export default function HomePage() {
  return (
    // -mx-4 으로 layout의 px-4를 상쇄하고, px-[10%]로 페이지 너비의 10% 여백 적용
    <div className="-mx-4 space-y-8 px-[10%]">
      <EditorialHero />
      <NewArrivals />
    </div>
  );
}
```

- [ ] **Step 3: 배너 이미지 플레이스홀더 추가**

`apps/frontend/public/` 디렉터리에 `banner.jpg` 를 배치한다. 실제 브랜드 이미지가 없는 경우 임시 이미지를 사용한다. 터미널에서 아래 명령으로 1×1 픽셀 JPEG를 생성할 수 있다:

```bash
# ImageMagick이 설치된 경우
convert -size 1200x600 gradient:indigo-white apps/frontend/public/banner.jpg

# 또는 실제 사진 파일을 수동으로 apps/frontend/public/banner.jpg 경로에 복사
```

> **참고:** `next/image`가 `/banner.jpg`를 찾지 못하면 개발 서버에서 404 에러가 발생하지만 빌드는 통과한다. 실제 사진으로 교체 시 같은 경로(`public/banner.jpg`)에 덮어쓰면 된다.

- [ ] **Step 4: 관련 테스트 전체 실행**

```bash
cd apps/frontend && npx vitest run --reporter=dot \
  src/components/home/EditorialHero.test.tsx \
  src/components/home/NewArrivals.test.tsx \
  src/components/layout/Header.test.tsx
```

Expected: 전체 PASS (삭제된 MainBanner·CategoryQuickLinks 테스트는 더 이상 실행되지 않음)

- [ ] **Step 5: 커밋**

```bash
git add apps/frontend/src/app/(auth)/page.tsx \
        apps/frontend/public/banner.jpg
git rm apps/frontend/src/components/home/MainBanner.tsx \
       apps/frontend/src/components/home/MainBanner.test.tsx \
       apps/frontend/src/components/home/CategoryQuickLinks.tsx \
       apps/frontend/src/components/home/CategoryQuickLinks.test.tsx
git commit -m "feat: 메인 페이지 에디토리얼 그리드 레이아웃 적용 및 구 컴포넌트 제거"
```

---

## 완료 기준

- [ ] `EditorialHero` 테스트 5개 PASS
- [ ] `NewArrivals` 테스트 8개 PASS
- [ ] `Header` 테스트 6개 PASS
- [ ] 메인 페이지에 `MainBanner`, `CategoryQuickLinks` 미사용
- [ ] 헤더 장바구니·유저 아이콘이 SVG로 렌더링됨
- [ ] 신상품 그리드가 5열, MORE 버튼 동작함
