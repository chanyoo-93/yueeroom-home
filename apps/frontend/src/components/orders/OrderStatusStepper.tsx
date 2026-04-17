'use client';

import type { OrderStatus } from '@/lib/types/order';

interface OrderStatusStepperProps {
  status: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
}

const STEPS = ['결제 완료', '배송 준비', '배송 중', '배송 완료'] as const;

// 각 OrderStatus의 현재 진행 스텝 인덱스 (0-based). DELIVERED는 모든 스텝 완료를 위해 STEPS.length 사용
const ACTIVE_STEP_INDEX: Partial<Record<OrderStatus, number>> = {
  PAID: 0,
  SHIPPING: 2,
  DELIVERED: STEPS.length,
};

// CJ대한통운, 한진, 롯데 등 주요 택배사 추적 URL
const CARRIER_TRACKING_URLS: Record<string, string> = {
  CJ대한통운: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  한진: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
  롯데: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=',
  로젠: 'http://www.ilogen.com/web/personal/trace/',
  우체국: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=',
};

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const base = CARRIER_TRACKING_URLS[carrier];
  return base
    ? `${base}${trackingNumber}`
    : `https://search.naver.com/search.naver?query=${encodeURIComponent(`${carrier} ${trackingNumber} 배송조회`)}`;
}

export default function OrderStatusStepper({
  status,
  carrier,
  trackingNumber,
}: OrderStatusStepperProps) {
  const activeIndex = ACTIVE_STEP_INDEX[status];

  if (activeIndex === undefined) return null;

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <ol className="flex items-start justify-between">
        {STEPS.map((label, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          const ariaLabel = isDone
            ? `${label} (완료)`
            : isActive
              ? `${label} (현재)`
              : `${label} (대기)`;

          return (
            <li
              key={label}
              role="listitem"
              aria-label={ariaLabel}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              {/* 스텝 원 + 연결선 */}
              <div className="flex w-full items-center">
                {/* 왼쪽 선 */}
                <div
                  className={`h-0.5 flex-1 ${index === 0 ? 'invisible' : isDone || isActive ? 'bg-indigo-500' : 'bg-gray-200'}`}
                />
                {/* 원 */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isDone
                      ? 'bg-indigo-500 text-white'
                      : isActive
                        ? 'border-2 border-indigo-500 bg-white text-indigo-600'
                        : 'border-2 border-gray-200 bg-white text-gray-400'
                  }`}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {/* 오른쪽 선 */}
                <div
                  className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? 'invisible' : isDone ? 'bg-indigo-500' : 'bg-gray-200'}`}
                />
              </div>

              {/* 레이블 */}
              <span
                className={`text-center text-xs leading-tight ${
                  isActive
                    ? 'font-semibold text-indigo-600'
                    : isDone
                      ? 'text-gray-600'
                      : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* 배송 추적 */}
      {trackingNumber && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">
            {carrier && <span className="font-medium text-gray-700">{carrier}</span>}
            {carrier ? ' · ' : ''}
            {trackingNumber}
          </span>
          <a
            href={getTrackingUrl(carrier ?? '', trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
          >
            배송 추적 &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
