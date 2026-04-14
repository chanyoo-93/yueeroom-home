import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/hooks/useCategories');

import { useCategories } from '@/lib/hooks/useCategories';
import CategoryQuickLinks from './CategoryQuickLinks';

function mockCategory(id: string, name: string, slug: string) {
  return {
    id,
    name,
    slug,
    parentId: null,
    displayOrder: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    children: [],
  };
}

describe('CategoryQuickLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중 스켈레톤을 렌더링한다', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useCategories>);

    render(<CategoryQuickLinks />);

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('카테고리 목록을 렌더링한다', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        mockCategory('1', '상의', 'top'),
        mockCategory('2', '하의', 'bottom'),
        mockCategory('3', '원피스', 'onepiece'),
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCategories>);

    render(<CategoryQuickLinks />);

    expect(screen.getByText('상의')).toBeInTheDocument();
    expect(screen.getByText('하의')).toBeInTheDocument();
    expect(screen.getByText('원피스')).toBeInTheDocument();
  });

  it('카테고리 링크가 올바른 경로를 가리킨다', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [mockCategory('cat-1', '상의', 'top')],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCategories>);

    render(<CategoryQuickLinks />);

    const link = screen.getByRole('link', { name: '상의' });
    expect(link).toHaveAttribute('href', '/products?categoryId=cat-1');
  });

  it('카테고리가 없을 때 아무것도 렌더링하지 않는다', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCategories>);

    const { container } = render(<CategoryQuickLinks />);

    // 카테고리 섹션 자체가 비어있거나 렌더링되지 않음
    expect(container.querySelector('[data-testid="category-grid"]')).toBeNull();
  });

  it('"카테고리" 섹션 제목을 렌더링한다', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [mockCategory('1', '상의', 'top')],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useCategories>);

    render(<CategoryQuickLinks />);

    expect(screen.getByRole('heading', { name: '카테고리' })).toBeInTheDocument();
  });
});
