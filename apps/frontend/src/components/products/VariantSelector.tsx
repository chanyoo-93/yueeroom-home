'use client';

import type { ProductVariant } from '@/lib/types/product';

function isInStock(variant: ProductVariant): boolean {
  return (variant.inventory?.quantity ?? 0) > 0;
}

interface Props {
  variants: ProductVariant[];
  selectedColor: string | null;
  selectedSize: string | null;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
}

export default function VariantSelector({
  variants,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
}: Props) {
  const colors = [...new Set(variants.map((v) => v.color))];
  const sizes = [...new Set(variants.map((v) => v.size))];

  // 해당 색상의 재고가 하나라도 있으면 색상 선택 가능
  const isColorAvailable = (color: string) =>
    variants.some((v) => v.color === color && isInStock(v));

  // 선택된 색상이 있으면 그 색상 + 해당 사이즈 조합으로 재고 확인,
  // 색상 미선택 시 임의 색상과의 조합에 재고가 있으면 사이즈 활성화
  const isSizeAvailable = (size: string) => {
    if (selectedColor) {
      const variant = variants.find((v) => v.size === size && v.color === selectedColor);
      return variant ? isInStock(variant) : false;
    }
    return variants.some((v) => v.size === size && isInStock(v));
  };

  if (variants.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* 색상 선택 */}
      {colors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            색상{selectedColor ? <span className="ml-1 text-indigo-600">{selectedColor}</span> : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const available = isColorAvailable(color);
              const selected = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => available && onColorChange(color)}
                  disabled={!available}
                  aria-label={color}
                  aria-pressed={selected}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                      : available
                        ? 'border-gray-200 text-gray-700 hover:border-indigo-400'
                        : 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 사이즈 선택 */}
      {sizes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            사이즈
            {selectedSize ? <span className="ml-1 text-indigo-600">{selectedSize}</span> : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isSizeAvailable(size);
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => available && onSizeChange(size)}
                  disabled={!available}
                  aria-label={`사이즈 ${size}`}
                  aria-pressed={selected}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                      : available
                        ? 'border-gray-200 text-gray-700 hover:border-indigo-400'
                        : 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
