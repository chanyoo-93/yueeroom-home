import { Suspense } from 'react';
import ProductDetailContent from '@/components/products/ProductDetailContent';

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
