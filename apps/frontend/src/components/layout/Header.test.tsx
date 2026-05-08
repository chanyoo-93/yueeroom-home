import { describe, it, expect, vi } from 'vitest';
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

// MiniCart 는 별도 테스트에서 검증하므로 여기서는 간단히 모킹
vi.mock('./MiniCart', () => ({
  default: () => (
    <a href="/cart" aria-label="장바구니">
      🛒
    </a>
  ),
}));

import Header from './Header';

describe('Header', () => {
  it('로고(유이룸) 텍스트가 렌더링된다', () => {
    render(<Header />);
    expect(screen.getByText('유이룸')).toBeInTheDocument();
  });

  it('로고는 홈(/)으로 이동하는 링크이다', () => {
    render(<Header />);
    const logo = screen.getByText('유이룸').closest('a');
    expect(logo).toHaveAttribute('href', '/');
  });

  it('검색 입력창이 렌더링된다', () => {
    render(<Header />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('장바구니 링크가 렌더링된다', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /장바구니/ })).toHaveAttribute('href', '/cart');
  });

  it('마이페이지 링크가 렌더링된다', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /마이페이지/ })).toHaveAttribute('href', '/my-page');
  });

  it('헤더 내비게이션에 aria-label이 있다', () => {
    render(<Header />);
    expect(screen.getByRole('navigation', { name: /주요 메뉴/ })).toBeInTheDocument();
  });
});
