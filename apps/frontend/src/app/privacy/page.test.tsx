import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from './page';

describe('PrivacyPage', () => {
  it('개인정보 처리방침 제목이 렌더링된다', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { name: /개인정보 처리방침/ })).toBeInTheDocument();
  });

  it('참조 문서의 조항 번호가 포함된 전체 섹션 제목이 렌더링된다', () => {
    render(<PrivacyPage />);

    [
      '1. 개인정보의 처리 목적',
      '2. 개인정보의 처리 및 보유 기간',
      '3. 처리하는 개인정보의 항목 및 수집 방법',
      '4. 만 14세 미만 아동의 개인정보 처리에 관한 사항',
      '5. 개인정보의 제3자 제공에 관한 사항',
      '6. 개인정보처리의 위탁에 관한 사항',
      '7. 개인정보의 파기절차 및 파기방법',
      '8. 정보주체와 법정대리인의 권리·의무 및 그 행사방법에 관한 사항',
      '9. 개인정보의 안전성 확보조치에 관한 사항',
      '10. 개인정보를 자동으로 수집하는 장치의 설치·운영 및 그 거부에 관한 사항',
      '11. 개인정보 보호책임자에 관한 사항',
      '12. 정보주체의 권익침해에 대한 구제방법',
      '13. 개인정보처리방침 변경',
    ].forEach((heading) => {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    });
  });

  it('열람·정정·삭제 요청 절차 안내가 포함된다', () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/열람·정정·삭제/)).toBeInTheDocument();
  });
});
