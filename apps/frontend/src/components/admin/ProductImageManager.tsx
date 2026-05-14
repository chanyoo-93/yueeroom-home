'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useUploadImage, useDeleteImage } from '@/lib/hooks/useAdminProducts';
import type { ProductImage } from '@/lib/types/product';

const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  productId: string;
  images: ProductImage[];
}

export default function ProductImageManager({ productId, images }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const { mutate: uploadImage, isPending: isUploading } = useUploadImage();
  const { mutate: deleteImage, isPending: isDeleting } = useDeleteImage();

  const sorted = [...images].sort((a, b) => a.order - b.order);

  function handleFiles(files: FileList) {
    setUploadError('');
    const oversized = Array.from(files).find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setUploadError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    Array.from(files).forEach((file) => {
      uploadImage({ productId, file });
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((img, idx) => (
          <div
            key={img.id}
            className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            <Image src={img.url} alt={`상품 이미지 ${idx + 1}`} fill className="object-cover" />
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                대표
              </span>
            )}
            <button
              type="button"
              onClick={() => deleteImage({ productId, imageId: img.id })}
              disabled={isDeleting}
              aria-label="이미지 삭제"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 disabled:opacity-50"
        >
          {isUploading ? (
            <span className="text-xs">업로드 중...</span>
          ) : (
            <>
              <span className="text-2xl leading-none">+</span>
              <span className="mt-1 text-xs">이미지 추가</span>
            </>
          )}
        </button>
      </div>

      {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
