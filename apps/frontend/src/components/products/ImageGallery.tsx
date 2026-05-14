'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@/lib/types/product';

interface Props {
  images: ProductImage[];
  productName: string;
}

export default function ImageGallery({ images, productName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = images[selectedIndex];

  return (
    <div className="space-y-3">
      {/* 메인 이미지 */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
        {currentImage ? (
          <Image
            src={currentImage.url}
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

      {/* 썸네일 목록 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              aria-label={`${index + 1}번째 이미지`}
              aria-pressed={selectedIndex === index}
              className={`relative aspect-square h-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                selectedIndex === index
                  ? 'border-indigo-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image
                src={image.url}
                alt={`${productName} ${index + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
