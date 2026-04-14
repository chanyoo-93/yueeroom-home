import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarFilter from './SidebarFilter';
import type { ProductListParams } from '@/lib/api/products';

function mockCategory(id: string, name: string, slug: string, isActive = true) {
  return {
    id,
    name,
    slug,
    parentId: null,
    displayOrder: 0,
    isActive,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    children: [],
  };
}

const categories = [
  mockCategory('cat-1', '상의', 'top'),
  mockCategory('cat-2', '하의', 'bottom'),
  mockCategory('cat-3', '비활성', 'inactive', false),
];

describe('SidebarFilter', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('활성 카테고리 목록을 렌더링한다', () => {
    render(<SidebarFilter categories={categories} filters={{}} onChange={onChange} />);

    expect(screen.getByRole('button', { name: '상의' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '하의' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '비활성' })).toBeNull();
  });

  it('"전체" 버튼이 렌더링된다', () => {
    render(<SidebarFilter categories={categories} filters={{}} onChange={onChange} />);

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
  });

  it('카테고리 클릭 시 categoryId와 page: 1을 포함하여 onChange를 호출한다', async () => {
    render(<SidebarFilter categories={categories} filters={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '상의' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1', page: 1 }),
    );
  });

  it('"전체" 클릭 시 categoryId를 undefined로 초기화한다', async () => {
    const filters: ProductListParams = { categoryId: 'cat-1' };
    render(<SidebarFilter categories={categories} filters={filters} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '전체' }));

    const called = onChange.mock.calls[0][0] as ProductListParams;
    expect(called.categoryId).toBeUndefined();
    expect(called.page).toBe(1);
  });

  it('최소 가격 입력 시 onChange를 호출한다', () => {
    render(<SidebarFilter categories={[]} filters={{}} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: '최소 가격' }), {
      target: { value: '10000' },
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minPrice: 10000, page: 1 }));
  });

  it('사이즈 버튼 클릭 시 size를 설정한다', async () => {
    render(<SidebarFilter categories={[]} filters={{}} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '100' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ size: '100', page: 1 }));
  });

  it('이미 선택된 사이즈 클릭 시 size를 undefined로 해제한다', async () => {
    const filters: ProductListParams = { size: '100' };
    render(<SidebarFilter categories={[]} filters={filters} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '100' }));

    const called = onChange.mock.calls[0][0] as ProductListParams;
    expect(called.size).toBeUndefined();
  });

  it('"필터 초기화" 클릭 시 filters를 page: 1로 초기화한다', async () => {
    const filters: ProductListParams = { categoryId: 'cat-1', size: '100', minPrice: 5000 };
    render(<SidebarFilter categories={categories} filters={filters} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '필터 초기화' }));

    expect(onChange).toHaveBeenCalledWith({ page: 1 });
  });
});
