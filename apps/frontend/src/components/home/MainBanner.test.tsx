import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import MainBanner from './MainBanner';

describe('MainBanner', () => {
  it('쇼핑몰 이름을 렌더링한다', () => {
    render(<MainBanner />);
    expect(screen.getByText('유이룸')).toBeInTheDocument();
  });

  it('슬로건 텍스트를 렌더링한다', () => {
    render(<MainBanner />);
    expect(screen.getByText(/프리미엄 유아\/아동복/)).toBeInTheDocument();
  });

  it('"상품 보기" 링크를 렌더링한다', () => {
    render(<MainBanner />);
    const link = screen.getByRole('link', { name: '상품 보기' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/products');
  });

  it('섹션에 aria-label이 있다', () => {
    render(<MainBanner />);
    expect(screen.getByRole('region', { name: /메인 배너/ })).toBeInTheDocument();
  });
});
