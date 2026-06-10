import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressForm from './AddressForm';

vi.mock('@/components/address/DaumPostcodeModal', () => ({
  default: ({
    isOpen,
    onComplete,
  }: {
    isOpen: boolean;
    onComplete: (zip: string, addr: string) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <button
        data-testid="postcode-complete"
        onClick={() => onComplete('06236', '서울 강남구 테헤란로 152')}
      >
        주소 선택
      </button>
    ) : null,
}));

describe('AddressForm', () => {
  it('주소 검색 없이 제출하면 에러 메시지 표시', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('배송지명'), '집');
    await userEvent.type(screen.getByLabelText('수령인'), '홍길동');
    await userEvent.type(screen.getByLabelText('연락처'), '010-1234-5678');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(await screen.findByText('주소 검색을 먼저 진행해주세요.')).toBeInTheDocument();
  });

  it('주소 검색 버튼 클릭 시 DaumPostcodeModal 열림', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    expect(screen.getByTestId('postcode-complete')).toBeInTheDocument();
  });

  it('주소 검색 완료 후 zipCode·address1 자동 채움', async () => {
    render(<AddressForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    await userEvent.click(screen.getByTestId('postcode-complete'));
    expect(screen.getByDisplayValue('06236')).toBeInTheDocument();
    expect(screen.getByDisplayValue('서울 강남구 테헤란로 152')).toBeInTheDocument();
  });

  it('정상 제출 시 onSubmit 호출', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddressForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    await userEvent.click(screen.getByTestId('postcode-complete'));
    await userEvent.type(screen.getByLabelText('배송지명'), '집');
    await userEvent.type(screen.getByLabelText('수령인'), '홍길동');
    await userEvent.type(screen.getByLabelText('연락처'), '010-1234-5678');
    await userEvent.type(screen.getByLabelText('상세주소'), '101호');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '집',
        recipient: '홍길동',
        phone: '010-1234-5678',
        zipCode: '06236',
        address1: '서울 강남구 테헤란로 152',
        address2: '101호',
      });
    });
  });

  it('취소 버튼 클릭 시 onCancel 호출', async () => {
    const onCancel = vi.fn();
    render(<AddressForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('상세주소 없이 제출해도 onSubmit 호출됨 (address2 선택사항)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddressForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '주소 검색' }));
    await userEvent.click(screen.getByTestId('postcode-complete'));
    await userEvent.type(screen.getByLabelText('배송지명'), '집');
    await userEvent.type(screen.getByLabelText('수령인'), '홍길동');
    await userEvent.type(screen.getByLabelText('연락처'), '010-1234-5678');
    await userEvent.click(screen.getByRole('button', { name: '추가' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '집',
        recipient: '홍길동',
        phone: '010-1234-5678',
        zipCode: '06236',
        address1: '서울 강남구 테헤란로 152',
        address2: undefined,
      });
    });
  });
});
