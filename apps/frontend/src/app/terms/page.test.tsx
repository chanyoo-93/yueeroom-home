import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsPage from './page';

describe('TermsPage', () => {
  it('이용약관 제목이 렌더링된다', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: /이용약관/ })).toBeInTheDocument();
  });

  it('주요 조항 섹션이 포함된다', () => {
    render(<TermsPage />);
    expect(screen.getByRole('heading', { name: /제1조.*목적/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /제2조.*정의/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /제9조.*구매/ })).toBeInTheDocument();
  });

  it('개인정보 처리방침 링크가 포함된다', () => {
    render(<TermsPage />);
    const link = screen.getByRole('link', { name: /개인정보 처리방침/ });
    expect(link).toHaveAttribute('href', '/privacy');
  });
});
