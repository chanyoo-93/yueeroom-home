import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/hooks/useAdminStats', () => ({
  useAdminSalesStats: vi.fn(),
  useAdminOrderStats: vi.fn(),
}));

// recharts는 jsdom에서 동작하지 않으므로 mock
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminDashboardPage from './page';
import { useAdminSalesStats, useAdminOrderStats } from '@/lib/hooks/useAdminStats';
import type { SalesStatsResponse, OrderStatsResponse } from '@/lib/types/admin';

const mockSalesStats: SalesStatsResponse = {
  daily: [
    { date: '2026-04-22', revenue: 150000, orderCount: 3 },
    { date: '2026-04-21', revenue: 80000, orderCount: 2 },
  ],
  monthly: [
    { month: '2026-04', revenue: 500000, orderCount: 10 },
    { month: '2026-03', revenue: 320000, orderCount: 7 },
  ],
  topProducts: [
    { id: 'prod-1', name: '봄 원피스', totalSold: 42, totalRevenue: 2100000 },
    { id: 'prod-2', name: '여름 티셔츠', totalSold: 30, totalRevenue: 900000 },
  ],
};

const mockOrderStats: OrderStatsResponse = {
  statusBreakdown: {
    PENDING: 5,
    PAID: 3,
    DELIVERED: 10,
  },
  totalOrders: 18,
  pendingUsersCount: 7,
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('로딩 중에는 로딩 메시지를 표시한다', () => {
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    expect(screen.getByLabelText('로딩 중')).toBeInTheDocument();
  });

  it('데이터 로드 후 요약 카드를 표시한다', () => {
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: mockSalesStats,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: mockOrderStats,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    expect(screen.getByText('이번 달 총 매출')).toBeInTheDocument();
    expect(screen.getByText('500,000원')).toBeInTheDocument();
    expect(screen.getByText('전체 주문 수')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('신규 가입 신청')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('인기 상품 Top 5를 올바르게 표시한다', () => {
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: mockSalesStats,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: mockOrderStats,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    expect(screen.getByText('봄 원피스')).toBeInTheDocument();
    expect(screen.getByText('42개')).toBeInTheDocument();
    expect(screen.getByText('여름 티셔츠')).toBeInTheDocument();
    expect(screen.getByText('30개')).toBeInTheDocument();
  });

  it('주문 상태 현황을 올바르게 표시한다', () => {
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: mockSalesStats,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: mockOrderStats,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    expect(screen.getByText('결제 대기')).toBeInTheDocument();
    expect(screen.getByText('5건')).toBeInTheDocument();
    expect(screen.getByText('배송 완료')).toBeInTheDocument();
    expect(screen.getByText('10건')).toBeInTheDocument();
  });

  it('데이터가 없을 때 빈 상태 메시지를 표시한다', () => {
    const emptySales: SalesStatsResponse = { daily: [], monthly: [], topProducts: [] };
    const emptyOrders: OrderStatsResponse = {
      statusBreakdown: {},
      totalOrders: 0,
      pendingUsersCount: 0,
    };

    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: emptySales,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: emptyOrders,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    expect(screen.getAllByText('데이터가 없습니다.')).toHaveLength(2); // 일별 + 월별
    expect(screen.getByText('주문이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('판매 데이터가 없습니다.')).toBeInTheDocument();
  });

  it('신규 가입 신청이 있을 때 강조 표시(하이라이트)한다', () => {
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: mockSalesStats,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: mockOrderStats,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    const card = screen.getByText('신규 가입 신청').closest('div');
    expect(card?.className).toContain('orange');
  });

  it('신규 가입 신청이 없을 때 하이라이트하지 않는다', () => {
    const noNewUsers: OrderStatsResponse = { ...mockOrderStats, pendingUsersCount: 0 };
    vi.mocked(useAdminSalesStats).mockReturnValue({
      data: mockSalesStats,
      isLoading: false,
    } as ReturnType<typeof useAdminSalesStats>);
    vi.mocked(useAdminOrderStats).mockReturnValue({
      data: noNewUsers,
      isLoading: false,
    } as ReturnType<typeof useAdminOrderStats>);

    render(<AdminDashboardPage />);

    const card = screen.getByText('신규 가입 신청').closest('div');
    expect(card?.className).not.toContain('orange');
  });
});
