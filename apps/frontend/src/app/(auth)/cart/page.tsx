import { Suspense } from 'react';
import CartContent from '@/components/cart/CartContent';

export const metadata = {
  title: '장바구니 | 유이룸',
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-screen-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">장바구니</h1>
      <Suspense>
        <CartContent />
      </Suspense>
    </main>
  );
}
