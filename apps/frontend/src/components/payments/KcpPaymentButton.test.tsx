import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api/payments', () => ({
  kcpCardPrepare: vi.fn(),
}));

import { kcpCardPrepare } from '@/lib/api/payments';
import KcpPaymentButton from './KcpPaymentButton';

const mockKcpCardPrepare = vi.mocked(kcpCardPrepare);
const mockKcpPay = vi.fn();

describe('KcpPaymentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as Record<string, unknown>).KCP = { pay: mockKcpPay };
    mockKcpCardPrepare.mockResolvedValue({
      siteCode: 'T0000',
      orderId: 'order-1',
      amount: 50000,
      productName: '베이비 롬퍼',
      timestamp: '1234567890',
      signData: 'test-sign',
    });
  });

  it('버튼 클릭 -> kcpCardPrepare 호출', async () => {
    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(mockKcpCardPrepare).toHaveBeenCalledWith('order-1');
    });
  });

  it('준비 성공 -> KCP SDK 팝업 호출', async () => {
    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(mockKcpPay).toHaveBeenCalledWith(
        expect.objectContaining({
          site_cd: 'T0000',
          ordr_idxx: 'order-1',
          good_mny: '50000',
        }),
        expect.any(Function),
      );
    });
  });

  it('API 오류 -> onError 콜백 호출', async () => {
    const onError = vi.fn();
    mockKcpCardPrepare.mockRejectedValue(new Error('API 오류'));

    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={onError} />);

    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('처리 중 버튼 비활성화', async () => {
    mockKcpCardPrepare.mockReturnValue(new Promise(() => {}));

    render(<KcpPaymentButton orderId="order-1" onSuccess={vi.fn()} onError={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '신용카드 결제' }));

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
