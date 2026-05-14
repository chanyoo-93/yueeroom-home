import Image from 'next/image';
import type { ProductImage } from '@/lib/types/product';

interface Props {
  images: ProductImage[];
  productName: string;
}

export default function ImageGallery({ images, productName }: Props) {
  const representativeImage = images[0];

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
      {representativeImage ? (
        <Image
          src={representativeImage.url}
          alt={productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center text-6xl text-gray-300">👕</div>
      )}
    </div>
  );
}
