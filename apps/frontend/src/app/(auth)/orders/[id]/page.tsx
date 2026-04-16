import { Suspense } from 'react';
import OrderDetail from '@/components/orders/OrderDetail';

export const metadata = { title: '주문 상세 | 유이룸' };

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">주문 상세</h1>
      <Suspense fallback={null}>
        <OrderDetail orderId={id} />
      </Suspense>
    </main>
  );
}
