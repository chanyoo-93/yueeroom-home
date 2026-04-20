import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/hooks/usePayments', () => ({
  usePayments: vi.fn(),
  useRequestRefund: vi.fn(),
}));

import PaymentList from './PaymentList';
import { usePayments, useRequestRefund } from '@/lib/hooks/usePayments';
import type { PaymentWithOrder } from '@/lib/types/order';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePayment(overrides: Partial<PaymentWithOrder> = {}): PaymentWithOrder {
  return {
    id: 'pay-1',
    orderId: 'order-1',
    status: 'COMPLETED',
    amount: 55000,
    paymentMethod: 'stripe',
    paymentKey: 'pi_test_123',
    paidAt: '2026-04-10T12:00:00.000Z',
    createdAt: '2026-04-10T11:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    order: {
      id: 'order-1',
      totalAmount: 55000,
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          variantId: 'var-1',
          quantity: 1,
          unitPrice: 55000,
          createdAt: '2026-04-10T11:00:00.000Z',
          variant: {
            id: 'var-1',
            size: '80',
            color: '블루',
            sku: 'SKU-001',
            product: { id: 'prod-1', name: '베이비 롬퍼', images: [] },
          },
        },
      ],
    },
    ...overrides,
  };
}

function makePaginatedResponse(payments: PaymentWithOrder[], overrides = {}) {
  return {
    items: payments,
    total: payments.length,
    page: 1,
    limit: 10,
    totalPages: 1,
    ...overrides,
  };
}

const mockMutate = vi.fn();

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PaymentList', () => {
  beforeEach(() => {
    (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    (useRequestRefund as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    mockMutate.mockReset();
  });

  // ── 로딩 ──────────────────────────────────────────────────────────────────────

  describe('로딩 상태', () => {
    it('로딩 중에는 스켈레톤을 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      render(<PaymentList />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── 에러 ──────────────────────────────────────────────────────────────────────

  describe('에러 상태', () => {
    it('에러 시 에러 메시지를 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      render(<PaymentList />);
      expect(screen.getByRole('alert')).toHaveTextContent('결제 내역을 불러오는 데 실패했습니다.');
    });
  });

  // ── 빈 목록 ───────────────────────────────────────────────────────────────────

  describe('결제 내역이 없는 경우', () => {
    it('결제 내역 없음 메시지를 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByText('아직 결제 내역이 없어요.')).toBeInTheDocument();
    });
  });

  // ── 목록 표시 ──────────────────────────────────────────────────────────────────

  describe('결제 목록 표시', () => {
    it('결제 금액을 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByText('55,000원')).toBeInTheDocument();
    });

    it('결제 방법 레이블을 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment({ paymentMethod: 'kakaopay' })]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByText('카카오페이')).toBeInTheDocument();
    });

    it('결제 상태 뱃지를 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment({ status: 'COMPLETED' })]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByText('결제 완료')).toBeInTheDocument();
    });

    it('결제일(paidAt)을 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByText(/2026년 4월 10일/)).toBeInTheDocument();
    });
  });

  // ── 모달 ────────────────────────────────────────────────────────────────────

  describe('상세 모달', () => {
    it('결제 카드 클릭 시 상세 모달이 열린다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('모달 닫기 버튼 클릭 시 모달이 닫힌다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      await userEvent.click(screen.getByRole('button', { name: '닫기' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('COMPLETED 결제는 환불 신청 버튼을 표시한다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment({ status: 'COMPLETED' })]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      expect(screen.getByRole('button', { name: '환불 신청' })).toBeInTheDocument();
    });

    it('REFUNDED 결제는 환불 신청 버튼을 표시하지 않는다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment({ status: 'REFUNDED' })]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      expect(screen.queryByRole('button', { name: '환불 신청' })).not.toBeInTheDocument();
    });

    it('환불 신청 버튼 클릭 시 확인 다이얼로그가 열린다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      await userEvent.click(screen.getByRole('button', { name: '환불 신청' }));
      expect(screen.getByText('환불 신청 확인')).toBeInTheDocument();
    });

    it('환불 확인 시 requestRefund를 호출한다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment({ id: 'pay-1' })]),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: /상세 보기/ }));
      await userEvent.click(screen.getByRole('button', { name: '환불 신청' }));
      await userEvent.click(screen.getByRole('button', { name: '확인' }));
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ paymentId: 'pay-1' }),
          expect.anything(),
        );
      });
    });
  });

  // ── 페이지네이션 ───────────────────────────────────────────────────────────────

  describe('페이지네이션', () => {
    it('totalPages가 1이면 페이지네이션을 렌더링하지 않는다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()], { totalPages: 1 }),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.queryByRole('button', { name: '다음 페이지' })).not.toBeInTheDocument();
    });

    it('totalPages가 2이면 페이지네이션을 렌더링한다', () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()], { totalPages: 2, total: 15 }),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      expect(screen.getByRole('button', { name: '이전 페이지' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다음 페이지' })).toBeInTheDocument();
    });

    it('다음 페이지 버튼 클릭 시 page가 증가한다', async () => {
      (usePayments as ReturnType<typeof vi.fn>).mockReturnValue({
        data: makePaginatedResponse([makePayment()], { totalPages: 3, page: 1 }),
        isLoading: false,
        isError: false,
      });
      render(<PaymentList />);
      await userEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
      expect(usePayments).toHaveBeenLastCalledWith(2, 10);
    });
  });
});
