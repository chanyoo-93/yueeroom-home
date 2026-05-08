import { Suspense } from 'react';
import OrderDetail from '@/components/orders/OrderDetail';

// output: 'export' requires at least one entry; actual data is fetched client-side at runtime
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function OrderDetailPage() {
  return (
    <main className="mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">주문 상세</h1>
      <Suspense fallback={null}>
        <OrderDetail />
      </Suspense>
    </main>
  );
}
