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

import Footer from './Footer';

describe('Footer', () => {
  it('사업자 정보가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getAllByText(/유이룸/).length).toBeGreaterThan(0);
    expect(screen.getByText(/사업자등록번호/)).toBeInTheDocument();
  });

  it('고객센터 정보가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getByText(/고객센터/)).toBeInTheDocument();
  });

  it('인스타그램 SNS 링크가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /인스타그램/ })).toBeInTheDocument();
  });

  it('유튜브 SNS 링크가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /유튜브/ })).toBeInTheDocument();
  });

  it('이용약관 링크가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
  });

  it('개인정보처리방침 링크가 렌더링된다', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });
});
