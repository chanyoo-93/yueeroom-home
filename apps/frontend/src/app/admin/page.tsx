'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdminSalesStats, useAdminOrderStats } from '@/lib/hooks/useAdminStats';

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  PROCESSING: '처리 중',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소',
  REFUNDED: '환불',
};

function formatKRW(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value) + '원';
}

export default function AdminDashboardPage() {
  const { data: salesStats, isLoading: salesLoading } = useAdminSalesStats();
  const { data: orderStats, isLoading: orderLoading } = useAdminOrderStats();

  const isLoading = salesLoading || orderLoading;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">대시보드</h1>

      {isLoading && (
        <p className="text-gray-500" aria-label="로딩 중">
          데이터를 불러오는 중...
        </p>
      )}

      {!isLoading && (
        <div className="space-y-8">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              label="이번 달 총 매출"
              value={(() => {
                if (!salesStats) return '-';
                const currentMonth = new Date().toISOString().slice(0, 7);
                const stats = salesStats.monthly.find((m) => m.month === currentMonth);
                return formatKRW(stats?.revenue ?? 0);
              })()}
            />
            <SummaryCard
              label="전체 주문 수"
              value={orderStats ? String(orderStats.totalOrders) : '-'}
            />
            <SummaryCard
              label="신규 가입 신청"
              value={orderStats ? String(orderStats.pendingUsersCount) : '-'}
              highlight={!!orderStats && orderStats.pendingUsersCount > 0}
            />
          </div>

          {/* 일별 매출 차트 */}
          <Section title="일별 매출 (최근 30일)">
            {salesStats && salesStats.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={[...salesStats.daily].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(v) => (typeof v === 'number' ? formatKRW(v) : String(v))}
                    labelFormatter={(l) => `날짜: ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    dot={false}
                    name="매출"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400">데이터가 없습니다.</p>
            )}
          </Section>

          {/* 월별 매출 차트 */}
          <Section title="월별 매출 (최근 12개월)">
            {salesStats && salesStats.monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[...salesStats.monthly].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? formatKRW(v) : String(v))} />
                  <Bar dataKey="revenue" fill="#818cf8" name="매출" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400">데이터가 없습니다.</p>
            )}
          </Section>

          {/* 주문 현황 및 인기 상품 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 주문 상태 현황 */}
            <Section title="주문 상태 현황">
              {orderStats && Object.keys(orderStats.statusBreakdown).length > 0 ? (
                <ul className="space-y-2">
                  {Object.entries(orderStats.statusBreakdown).map(([status, count]) => (
                    <li
                      key={status}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {ORDER_STATUS_LABEL[status] ?? status}
                      </span>
                      <span className="font-semibold text-gray-900">{count}건</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">주문이 없습니다.</p>
              )}
            </Section>

            {/* 인기 상품 Top 5 */}
            <Section title="인기 상품 Top 5 (판매량 기준)">
              {salesStats && salesStats.topProducts.length > 0 ? (
                <ol className="space-y-2">
                  {salesStats.topProducts.map((product, index) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm font-bold text-indigo-600">
                          {index + 1}
                        </span>
                        <span className="text-sm text-gray-800">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{product.totalSold}개</p>
                        <p className="text-xs text-gray-500">{formatKRW(product.totalRevenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-400">판매 데이터가 없습니다.</p>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${highlight ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}
