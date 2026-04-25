import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('개인정보 처리방침 제목이 렌더링된다', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: /개인정보 처리방침/ })).toBeInTheDocument();
  });

  it('수집 항목, 보유 기간, 파기 방법 섹션이 포함된다', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/수집하는 개인정보/)).toBeInTheDocument();
    expect(screen.getByText(/보유 및 이용 기간/)).toBeInTheDocument();
    expect(screen.getByText(/개인정보 파기/)).toBeInTheDocument();
  });

  it('열람·정정·삭제 요청 절차 안내가 포함된다', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/열람·정정·삭제/)).toBeInTheDocument();
  });
});
