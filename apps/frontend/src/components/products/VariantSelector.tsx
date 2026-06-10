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

  // 해당 색상 variant가 존재하면 선택 가능 (재고 유무와 무관)
  const colorExists = (color: string) => variants.some((v) => v.color === color);
  const isColorInStock = (color: string) => variants.some((v) => v.color === color && isInStock(v));

  // 선택된 색상이 있으면 그 색상 + 해당 사이즈 조합 존재 여부, 없으면 사이즈 variant 존재 여부
  const sizeExists = (size: string) => {
    if (selectedColor) return variants.some((v) => v.size === size && v.color === selectedColor);
    return variants.some((v) => v.size === size);
  };
  const isSizeInStock = (size: string) => {
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
              const exists = colorExists(color);
              const inStock = isColorInStock(color);
              const selected = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  disabled={!exists || !inStock}
                  aria-label={color}
                  aria-pressed={selected}
                  className={`relative rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                      : !exists
                        ? 'cursor-not-allowed border-gray-100 text-gray-300'
                        : !inStock
                          ? 'cursor-not-allowed border-gray-200 text-gray-400'
                          : 'border-gray-200 text-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {color}
                  {exists && !inStock && <span className="ml-1 text-xs text-gray-400">(품절)</span>}
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
              const exists = sizeExists(size);
              const inStock = isSizeInStock(size);
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => onSizeChange(size)}
                  disabled={!exists || !inStock}
                  aria-label={`사이즈 ${size}`}
                  aria-pressed={selected}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                      : !exists
                        ? 'cursor-not-allowed border-gray-100 text-gray-300'
                        : !inStock
                          ? 'cursor-not-allowed border-gray-200 text-gray-400'
                          : 'border-gray-200 text-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {size}
                  {exists && !inStock && <span className="ml-1 text-xs text-gray-400">(품절)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
