import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockPathname = vi.fn(() => '/admin');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

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

import AdminSidebar from './AdminSidebar';

describe('AdminSidebar', () => {
  it('대시보드 링크가 렌더링된다', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute('href', '/admin');
  });

  it('회원 관리 링크가 렌더링된다', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('link', { name: /회원 관리/ })).toHaveAttribute('href', '/admin/users');
  });

  it('상품 관리 링크가 렌더링된다', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('link', { name: /상품 관리/ })).toHaveAttribute(
      'href',
      '/admin/products',
    );
  });

  it('주문 관리 링크가 렌더링된다', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('link', { name: /주문 관리/ })).toHaveAttribute(
      'href',
      '/admin/orders',
    );
  });

  it('재고 관리 링크가 렌더링된다', () => {
    render(<AdminSidebar />);
    expect(screen.getByRole('link', { name: /재고 관리/ })).toHaveAttribute(
      'href',
      '/admin/inventory',
    );
  });

  it('현재 경로에 해당하는 메뉴가 활성화 스타일을 갖는다', () => {
    mockPathname.mockReturnValue('/admin/users');
    render(<AdminSidebar />);
    const usersLink = screen.getByRole('link', { name: /회원 관리/ });
    expect(usersLink).toHaveClass('bg-blue-50');
  });

  it('현재 경로가 아닌 메뉴는 활성화 스타일을 갖지 않는다', () => {
    mockPathname.mockReturnValue('/admin/users');
    render(<AdminSidebar />);
    const dashboardLink = screen.getByRole('link', { name: /대시보드/ });
    expect(dashboardLink).not.toHaveClass('bg-blue-50');
  });
});
