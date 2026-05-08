import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockPathname = vi.fn(() => '/');

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

import MobileNav from './MobileNav';

describe('MobileNav', () => {
  it('홈 탭이 렌더링된다', () => {
    render(<MobileNav />);
    expect(screen.getByRole('link', { name: /홈/ })).toHaveAttribute('href', '/');
  });

  it('카테고리 탭이 렌더링된다', () => {
    render(<MobileNav />);
    expect(screen.getByRole('link', { name: /카테고리/ })).toHaveAttribute('href', '/categories');
  });

  it('장바구니 탭이 렌더링된다', () => {
    render(<MobileNav />);
    expect(screen.getByRole('link', { name: /장바구니/ })).toHaveAttribute('href', '/cart');
  });

  it('마이페이지 탭이 렌더링된다', () => {
    render(<MobileNav />);
    expect(screen.getByRole('link', { name: /마이페이지/ })).toHaveAttribute('href', '/my-page');
  });

  it('현재 경로에 해당하는 탭이 활성화 스타일을 갖는다', () => {
    mockPathname.mockReturnValue('/cart');
    render(<MobileNav />);
    const cartLink = screen.getByRole('link', { name: /장바구니/ });
    expect(cartLink).toHaveClass('text-blue-600');
  });

  it('현재 경로가 아닌 탭은 활성화 스타일을 갖지 않는다', () => {
    mockPathname.mockReturnValue('/cart');
    render(<MobileNav />);
    const homeLink = screen.getByRole('link', { name: /홈/ });
    expect(homeLink).not.toHaveClass('text-blue-600');
  });

  it('모바일 내비게이션에 aria-label이 있다', () => {
    render(<MobileNav />);
    expect(screen.getByRole('navigation', { name: /모바일 내비게이션/ })).toBeInTheDocument();
  });
});
