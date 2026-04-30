import { Suspense } from 'react';
import ProductDetailContent from '@/components/products/ProductDetailContent';

// output: 'export' requires at least one entry; actual data is fetched client-side at runtime
export function generateStaticParams() {
  return [{ id: '_' }];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <ProductDetailContent productId={id} />
    </Suspense>
  );
}
