import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderStatusStepper from './OrderStatusStepper';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STEP_LABELS = ['결제 완료', '배송 준비', '배송 중', '배송 완료'];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OrderStatusStepper', () => {
  describe('스텝 레이블 렌더링', () => {
    it('4개 스텝 레이블을 모두 표시한다', () => {
      render(<OrderStatusStepper status="PAID" />);
      STEP_LABELS.forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe('PAID 상태', () => {
    it('현재 스텝으로 "결제 완료"가 표시된다', () => {
      render(<OrderStatusStepper status="PAID" />);
      const activeStep = screen.getByRole('listitem', { name: '결제 완료 (현재)' });
      expect(activeStep).toBeInTheDocument();
    });

    it('"배송 준비", "배송 중", "배송 완료"는 미완료 상태다', () => {
      render(<OrderStatusStepper status="PAID" />);
      expect(screen.getByRole('listitem', { name: '배송 준비 (대기)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 중 (대기)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 완료 (대기)' })).toBeInTheDocument();
    });
  });

  describe('SHIPPING 상태', () => {
    it('현재 스텝으로 "배송 중"이 표시된다', () => {
      render(<OrderStatusStepper status="SHIPPING" />);
      expect(screen.getByRole('listitem', { name: '배송 중 (현재)' })).toBeInTheDocument();
    });

    it('"결제 완료"와 "배송 준비"는 완료 상태다', () => {
      render(<OrderStatusStepper status="SHIPPING" />);
      expect(screen.getByRole('listitem', { name: '결제 완료 (완료)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 준비 (완료)' })).toBeInTheDocument();
    });

    it('"배송 완료"는 미완료 상태다', () => {
      render(<OrderStatusStepper status="SHIPPING" />);
      expect(screen.getByRole('listitem', { name: '배송 완료 (대기)' })).toBeInTheDocument();
    });
  });

  describe('DELIVERED 상태', () => {
    it('모든 스텝이 완료 상태다', () => {
      render(<OrderStatusStepper status="DELIVERED" />);
      expect(screen.getByRole('listitem', { name: '결제 완료 (완료)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 준비 (완료)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 중 (완료)' })).toBeInTheDocument();
      expect(screen.getByRole('listitem', { name: '배송 완료 (완료)' })).toBeInTheDocument();
    });
  });

  describe('CANCELLED / REFUNDED 상태', () => {
    it('CANCELLED일 때 스텝퍼를 렌더링하지 않는다', () => {
      const { container } = render(<OrderStatusStepper status="CANCELLED" />);
      expect(container.firstChild).toBeNull();
    });

    it('REFUNDED일 때 스텝퍼를 렌더링하지 않는다', () => {
      const { container } = render(<OrderStatusStepper status="REFUNDED" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('PENDING 상태', () => {
    it('PENDING일 때 스텝퍼를 렌더링하지 않는다', () => {
      const { container } = render(<OrderStatusStepper status="PENDING" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('송장 번호 연동', () => {
    it('trackingNumber와 carrier가 있을 때 배송 추적 링크를 표시한다', () => {
      render(
        <OrderStatusStepper status="SHIPPING" carrier="CJ대한통운" trackingNumber="123456789012" />,
      );
      expect(screen.getByRole('link', { name: /배송 추적/ })).toBeInTheDocument();
      expect(screen.getByText(/CJ대한통운/)).toBeInTheDocument();
      expect(screen.getByText(/123456789012/)).toBeInTheDocument();
    });

    it('trackingNumber가 없으면 배송 추적 링크를 표시하지 않는다', () => {
      render(<OrderStatusStepper status="SHIPPING" />);
      expect(screen.queryByRole('link', { name: /배송 추적/ })).not.toBeInTheDocument();
    });

    it('배송 추적 링크는 새 탭에서 열린다', () => {
      render(<OrderStatusStepper status="SHIPPING" carrier="한진" trackingNumber="987654321" />);
      const link = screen.getByRole('link', { name: /배송 추적/ });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
