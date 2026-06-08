import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/payments', () => ({
  kcpVbankPrepare: vi.fn(),
}));

import { kcpVbankPrepare } from '@/lib/api/payments';
import VirtualAccountInfo from './VirtualAccountInfo';

const mockKcpVbankPrepare = vi.mocked(kcpVbankPrepare);

describe('VirtualAccountInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKcpVbankPrepare.mockResolvedValue({
      accountNumber: '123-456-789012',
      bankName: '국민은행',
      expiresAt: '2026-06-06T12:00:00.000Z',
      amount: 50000,
    });
  });

  it('마운트 시 kcpVbankPrepare에 orderId를 전달한다', async () => {
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    await waitFor(() => {
      expect(mockKcpVbankPrepare).toHaveBeenCalledWith('order-1');
    });
  });

  it('계좌 발급 후 계좌번호, 은행명, 금액을 표시한다', async () => {
    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(await screen.findByText('123-456-789012')).toBeInTheDocument();
    expect(screen.getByText('국민은행')).toBeInTheDocument();
    expect(screen.getByText('50,000원')).toBeInTheDocument();
  });

  it('계좌 발급 중 로딩 문구를 표시한다', () => {
    mockKcpVbankPrepare.mockReturnValue(new Promise(() => {}));

    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(screen.getByText('계좌 발급 중...')).toBeInTheDocument();
  });

  it('API 에러 시 실패 문구를 표시한다', async () => {
    mockKcpVbankPrepare.mockRejectedValue(new Error('failed'));

    render(<VirtualAccountInfo orderId="order-1" onBack={vi.fn()} />);

    expect(await screen.findByText(/가상계좌 발급에 실패했습니다/)).toBeInTheDocument();
  });

  it('뒤로 버튼 클릭 시 onBack을 호출한다', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(<VirtualAccountInfo orderId="order-1" onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: '뒤로' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
