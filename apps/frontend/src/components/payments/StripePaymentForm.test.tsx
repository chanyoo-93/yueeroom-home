import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StripePaymentForm from './StripePaymentForm';

// ── Stripe 모킹 ──────────────────────────────────────────────────────────────

const mockConfirmCardPayment = vi.fn();
const mockGetElement = vi.fn();

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    confirmCardPayment: mockConfirmCardPayment,
  }),
  useElements: () => ({
    getElement: mockGetElement,
  }),
}));

vi.mock('@/lib/api/payments', () => ({
  createPaymentIntent: vi.fn(),
}));

import { createPaymentIntent } from '@/lib/api/payments';

const mockCreatePaymentIntent = vi.mocked(createPaymentIntent);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StripePaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElement.mockReturnValue({ _type: 'CardElement' });
    mockCreatePaymentIntent.mockResolvedValue({
      clientSecret: 'pi_test_secret',
      paymentId: 'payment-1',
    });
    mockConfirmCardPayment.mockResolvedValue({ error: null });
  });

  describe('할부 선택 UI 노출 여부', () => {
    it('5만원 미만(49999원) → 할부 선택 UI 미노출', () => {
      render(<StripePaymentForm orderId="order-1" amount={49999} onSuccess={vi.fn()} />);

      expect(screen.queryByLabelText('할부 개월 수')).not.toBeInTheDocument();
    });

    it('5만원(50000원) 이상 → 할부 선택 UI 노출', () => {
      render(<StripePaymentForm orderId="order-1" amount={50000} onSuccess={vi.fn()} />);

      expect(screen.getByLabelText('할부 개월 수')).toBeInTheDocument();
    });

    it('5만원 초과(100000원) → 할부 선택 UI 노출', () => {
      render(<StripePaymentForm orderId="order-1" amount={100000} onSuccess={vi.fn()} />);

      expect(screen.getByLabelText('할부 개월 수')).toBeInTheDocument();
    });

    it('할부 옵션에 2, 3, 6, 12개월이 포함된다', () => {
      render(<StripePaymentForm orderId="order-1" amount={50000} onSuccess={vi.fn()} />);

      expect(screen.getByRole('option', { name: '2개월' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '3개월' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '6개월' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '12개월' })).toBeInTheDocument();
    });
  });

  describe('할부 선택 후 결제', () => {
    it('할부 개월 선택 시 createPaymentIntent에 installmentMonths 전달', async () => {
      render(<StripePaymentForm orderId="order-1" amount={50000} onSuccess={vi.fn()} />);

      const select = screen.getByLabelText('할부 개월 수');
      await userEvent.selectOptions(select, '3');

      await userEvent.click(screen.getByRole('button', { name: '카드 결제' }));

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith('order-1', 3);
      });
    });

    it('일시불 선택(기본값) 시 installmentMonths 미전달', async () => {
      render(<StripePaymentForm orderId="order-1" amount={50000} onSuccess={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: '카드 결제' }));

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith('order-1', undefined);
      });
    });

    it('5만원 미만에서 결제 시 installmentMonths 미전달', async () => {
      render(<StripePaymentForm orderId="order-1" amount={30000} onSuccess={vi.fn()} />);

      await userEvent.click(screen.getByRole('button', { name: '카드 결제' }));

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith('order-1', undefined);
      });
    });
  });
});
