import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
  ),
}));

import ProductCard from './ProductCard';
import type { Product } from '@/lib/types/product';

function mockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: '베이비 블루 롬퍼',
    description: null,
    basePrice: 29000,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'cat-1', name: '상의', slug: 'top' },
    images: [],
    ...overrides,
  };
}

describe('ProductCard', () => {
  it('상품 이름과 가격을 렌더링한다', () => {
    render(<ProductCard product={mockProduct()} />);

    expect(screen.getByText('베이비 블루 롬퍼')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
  });

  it('상품 상세 페이지 링크를 렌더링한다', () => {
    render(<ProductCard product={mockProduct({ id: 'prod-42' })} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/prod-42');
  });

  it('이미지가 있으면 img 태그를 렌더링한다', () => {
    const product = mockProduct({
      images: [{ id: 'img-1', url: 'https://cdn.example.com/img.jpg', order: 0 }],
    });

    render(<ProductCard product={product} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/img.jpg');
    expect(img).toHaveAttribute('alt', '베이비 블루 롬퍼');
  });

  it('이미지가 없으면 플레이스홀더를 렌더링한다', () => {
    render(<ProductCard product={mockProduct({ images: [] })} />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('👕')).toBeInTheDocument();
  });

  it('가격을 한국어 형식으로 표시한다', () => {
    render(<ProductCard product={mockProduct({ basePrice: 1234567 })} />);

    expect(screen.getByText('1,234,567원')).toBeInTheDocument();
  });
});
