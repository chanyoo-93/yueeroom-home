import { Suspense } from 'react';
import OrderList from '@/components/orders/OrderList';

export const metadata = { title: '주문 내역 | 유이룸' };

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">주문 내역</h1>
      <Suspense fallback={null}>
        <OrderList />
      </Suspense>
    </main>
  );
}
