import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DaumPostcodeModal from './DaumPostcodeModal';

let testData = { zonecode: '06236', roadAddress: '서울 강남구 테헤란로 152', jibunAddress: '' };

vi.mock('react-daum-postcode', () => ({
  default: ({
    onComplete,
  }: {
    onComplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
  }) => (
    <button data-testid="daum-widget" onClick={() => onComplete(testData)}>
      주소 선택
    </button>
  ),
}));

beforeEach(() => {
  testData = { zonecode: '06236', roadAddress: '서울 강남구 테헤란로 152', jibunAddress: '' };
});

describe('DaumPostcodeModal', () => {
  it('isOpen=false 이면 렌더되지 않는다', () => {
    render(<DaumPostcodeModal isOpen={false} onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('주소 검색')).not.toBeInTheDocument();
  });

  it('isOpen=true 이면 모달이 렌더된다', () => {
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('주소 검색')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('오버레이 클릭 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('postcode-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('주소 선택 시 onComplete(zonecode, roadAddress) 호출', async () => {
    const onComplete = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={onComplete} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('daum-widget'));
    expect(onComplete).toHaveBeenCalledWith('06236', '서울 강남구 테헤란로 152');
  });

  it('ESC 키 입력 시 onClose 호출', async () => {
    const onClose = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('roadAddress가 없으면 jibunAddress를 address1로 전달한다', async () => {
    testData = { zonecode: '12345', roadAddress: '', jibunAddress: '서울 강남구 테헤란동 1' };
    const onComplete = vi.fn();
    render(<DaumPostcodeModal isOpen={true} onComplete={onComplete} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId('daum-widget'));
    expect(onComplete).toHaveBeenCalledWith('12345', '서울 강남구 테헤란동 1');
  });
});
