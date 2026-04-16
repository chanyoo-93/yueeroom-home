import { Suspense } from 'react';
import CheckoutContent from '@/components/checkout/CheckoutContent';

export const metadata = {
  title: '주문서 작성 | 유이룸',
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">주문서 작성</h1>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
