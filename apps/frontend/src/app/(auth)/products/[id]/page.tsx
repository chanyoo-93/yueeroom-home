import { Suspense } from 'react';
import ProductDetailContent from '@/components/products/ProductDetailContent';

// output: 'export' requires at least one entry; actual data is fetched client-side at runtime
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetailContent />
    </Suspense>
  );
}
