'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProductDetail } from '@/lib/hooks/useProductDetail';
import ImageGallery from './ImageGallery';
import VariantSelector from './VariantSelector';
import SizeGuideModal from './SizeGuideModal';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

interface Props {
  productId: string;
}

export default function ProductDetailContent({ productId }: Props) {
  const { data: product, isLoading, isError } = useProductDetail(productId);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // 로딩
  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  // 에러
  if (isError || !product) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500">상품 정보를 불러오는 데 실패했습니다.</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          상품 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const variants = product.variants ?? [];

  // 선택된 색상 + 사이즈에 해당하는 변형
  const selectedVariant =
    selectedColor && selectedSize
      ? (variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null)
      : null;

  const selectedVariantStock = selectedVariant?.inventory?.quantity ?? 0;
  const isCartEnabled = selectedVariant !== null && selectedVariantStock > 0;

  // 현재 가격 (변형 선택 시 변형 가격, 아니면 기본가)
  const displayPrice = selectedVariant?.price ?? product.basePrice;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (selectedSize) {
      const variant = variants.find((v) => v.color === color && v.size === selectedSize);
      const stock = variant?.inventory?.quantity ?? 0;
      if (stock <= 0) {
        setSelectedSize(null);
        setQuantity(1);
      } else {
        setQuantity((q) => Math.min(q, stock));
      }
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    if (selectedColor) {
      const variant = variants.find((v) => v.color === selectedColor && v.size === size);
      const stock = variant?.inventory?.quantity ?? 0;
      if (stock > 0) {
        setQuantity((q) => Math.min(q, stock));
      }
    }
  };

  const decreaseQuantity = () => setQuantity((q) => Math.max(1, q - 1));
  const increaseQuantity = () => setQuantity((q) => Math.min(selectedVariantStock, q + 1));

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 이미지 갤러리 */}
        <ImageGallery images={product.images} productName={product.name} />

        {/* 상품 정보 */}
        <div className="space-y-6">
          {/* 카테고리 + 상품명 */}
          <div className="space-y-1">
            <p className="text-sm text-gray-400">{product.category.name}</p>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-2xl font-bold text-indigo-600">{formatPrice(displayPrice)}</p>
          </div>

          {/* 상품 설명 */}
          {product.description && (
            <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          )}

          {/* 변형 선택 */}
          {variants.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400" />
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  aria-label="사이즈 가이드 열기"
                  className="text-xs text-indigo-500 hover:underline"
                >
                  사이즈 가이드
                </button>
              </div>
              <VariantSelector
                variants={variants}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorChange={handleColorChange}
                onSizeChange={handleSizeChange}
              />
            </div>
          )}

          {/* 재고 없음 안내 */}
          {selectedVariant && selectedVariantStock === 0 && (
            <p className="text-sm text-red-500">해당 옵션은 품절입니다.</p>
          )}

          {/* 수량 선택 */}
          {isCartEnabled && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-700">수량</p>
              <div className="flex items-center rounded-lg border border-gray-200">
                <button
                  onClick={decreaseQuantity}
                  aria-label="수량 줄이기"
                  className="px-3 py-2 text-gray-500 hover:text-gray-800 disabled:text-gray-200"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={increaseQuantity}
                  aria-label="수량 늘리기"
                  className="px-3 py-2 text-gray-500 hover:text-gray-800 disabled:text-gray-200"
                  disabled={quantity >= selectedVariantStock}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-400">재고 {selectedVariantStock}개</p>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-2">
            <button
              aria-label="장바구니 담기"
              disabled={!isCartEnabled}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                isCartEnabled
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400'
              }`}
            >
              {selectedVariant && selectedVariantStock === 0
                ? '품절된 옵션입니다'
                : isCartEnabled
                  ? '장바구니 담기'
                  : '옵션을 선택해 주세요'}
            </button>

            <button
              onClick={() => setIsWishlisted((w) => !w)}
              aria-label={isWishlisted ? '위시리스트에서 제거' : '위시리스트에 추가'}
              aria-pressed={isWishlisted}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                isWishlisted
                  ? 'border-red-200 bg-red-50 text-red-500'
                  : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'
              }`}
            >
              {isWishlisted ? '♥' : '♡'}
            </button>
          </div>
        </div>
      </div>

      {/* 사이즈 가이드 모달 */}
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </>
  );
}
