import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/hooks/useAdminProducts', () => ({
  useAdminProducts: vi.fn(),
  useCreateProduct: vi.fn(),
  useUpdateProduct: vi.fn(),
  useDeleteProduct: vi.fn(),
  useCreateVariant: vi.fn(),
  useDeleteVariant: vi.fn(),
  useUploadImage: vi.fn(),
  useDeleteImage: vi.fn(),
}));

vi.mock('@/lib/hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

import AdminProductsPage from './page';
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateVariant,
  useDeleteVariant,
  useUploadImage,
  useDeleteImage,
} from '@/lib/hooks/useAdminProducts';
import { useCategories } from '@/lib/hooks/useCategories';

const mockMutate = vi.fn();

const defaultMutation = { mutate: mockMutate, isPending: false };

const mockProducts = [
  {
    id: 'p1',
    name: '아기 원피스',
    categoryId: 'c1',
    basePrice: 29000,
    isActive: true,
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    category: { id: 'c1', name: '원피스', slug: 'dress' },
    images: [],
  },
  {
    id: 'p2',
    name: '유아 티셔츠',
    categoryId: 'c2',
    basePrice: 15000,
    isActive: false,
    description: '부드러운 소재',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    category: { id: 'c2', name: '티셔츠', slug: 'tshirt' },
    images: [],
  },
];

const mockCategories = [
  {
    id: 'c1',
    name: '원피스',
    slug: 'dress',
    parentId: null,
    displayOrder: 1,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    children: [],
  },
  {
    id: 'c2',
    name: '티셔츠',
    slug: 'tshirt',
    parentId: null,
    displayOrder: 2,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    children: [],
  },
];

beforeEach(() => {
  (useAdminProducts as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { data: mockProducts, total: 2, page: 1, limit: 20, nextCursor: null },
    isLoading: false,
    isError: false,
  });
  (useCreateProduct as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useUpdateProduct as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useDeleteProduct as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useCreateVariant as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useDeleteVariant as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useUploadImage as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useDeleteImage as ReturnType<typeof vi.fn>).mockReturnValue(defaultMutation);
  (useCategories as ReturnType<typeof vi.fn>).mockReturnValue({
    data: mockCategories,
    isLoading: false,
    isError: false,
  });
  mockMutate.mockReset();
});

describe('AdminProductsPage', () => {
  describe('상품 목록 테이블', () => {
    it('상품 목록을 테이블로 렌더링한다', () => {
      render(<AdminProductsPage />);
      expect(screen.getByText('아기 원피스')).toBeInTheDocument();
      expect(screen.getByText('유아 티셔츠')).toBeInTheDocument();
    });

    it('카테고리 이름을 표시한다', () => {
      render(<AdminProductsPage />);
      expect(screen.getByText('원피스')).toBeInTheDocument();
      expect(screen.getByText('티셔츠')).toBeInTheDocument();
    });

    it('가격을 원화 형식으로 표시한다', () => {
      render(<AdminProductsPage />);
      expect(screen.getByText('29,000원')).toBeInTheDocument();
      expect(screen.getByText('15,000원')).toBeInTheDocument();
    });

    it('상품 상태를 표시한다', () => {
      render(<AdminProductsPage />);
      expect(screen.getByText('판매중')).toBeInTheDocument();
      expect(screen.getByText('판매중지')).toBeInTheDocument();
    });

    it('로딩 중일 때 로딩 메시지를 표시한다', () => {
      (useAdminProducts as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      render(<AdminProductsPage />);
      expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
    });

    it('에러 발생 시 에러 메시지를 표시한다', () => {
      (useAdminProducts as ReturnType<typeof vi.fn>).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });
      render(<AdminProductsPage />);
      expect(screen.getByText(/오류/)).toBeInTheDocument();
    });

    it('상품이 없을 때 빈 메시지를 표시한다', () => {
      (useAdminProducts as ReturnType<typeof vi.fn>).mockReturnValue({
        data: { data: [], total: 0, page: 1, limit: 20, nextCursor: null },
        isLoading: false,
        isError: false,
      });
      render(<AdminProductsPage />);
      expect(screen.getByText('상품이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('상품 등록 폼', () => {
    it('상품 등록 버튼을 클릭하면 폼 모달이 열린다', () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText('상품 등록')).toBeInTheDocument();
    });

    it('이름이 비어 있으면 유효성 오류를 표시한다', async () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(screen.getByText('상품명을 입력해주세요.')).toBeInTheDocument();
      });
    });

    it('카테고리를 선택하지 않으면 유효성 오류를 표시한다', async () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('상품명'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(screen.getByText('카테고리를 선택해주세요.')).toBeInTheDocument();
      });
    });

    it('기본 가격이 비어 있으면 유효성 오류를 표시한다', async () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('상품명'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(within(dialog).getByLabelText('카테고리'), { target: { value: 'c1' } });
      fireEvent.change(within(dialog).getByLabelText('기본 가격 (원)'), { target: { value: '' } });
      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(screen.getByText('가격을 입력해주세요.')).toBeInTheDocument();
      });
    });

    it('기본 가격이 음수이면 유효성 오류를 표시한다', async () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('상품명'), {
        target: { value: '테스트 상품' },
      });
      fireEvent.change(within(dialog).getByLabelText('카테고리'), { target: { value: 'c1' } });
      fireEvent.change(within(dialog).getByLabelText('기본 가격 (원)'), {
        target: { value: '-1000' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(screen.getByText('가격은 0 이상이어야 합니다.')).toBeInTheDocument();
      });
    });

    it('모든 필드가 유효하면 저장 함수를 호출한다', async () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('상품명'), { target: { value: '새 상품' } });
      fireEvent.change(within(dialog).getByLabelText('카테고리'), { target: { value: 'c1' } });
      fireEvent.change(within(dialog).getByLabelText('기본 가격 (원)'), {
        target: { value: '20000' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ name: '새 상품', categoryId: 'c1', basePrice: 20000 }),
          expect.anything(),
        );
      });
    });

    it('취소 버튼을 클릭하면 폼이 닫힌다', () => {
      render(<AdminProductsPage />);
      fireEvent.click(screen.getByRole('button', { name: '상품 등록' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('상품 삭제 다이얼로그', () => {
    it('삭제 버튼을 클릭하면 확인 다이얼로그가 열린다', () => {
      render(<AdminProductsPage />);
      const [deleteBtn] = screen.getAllByRole('button', { name: '삭제' });
      fireEvent.click(deleteBtn!);
      expect(screen.getByText(/삭제하시겠습니까/)).toBeInTheDocument();
    });

    it('삭제 다이얼로그에서 취소를 누르면 닫힌다', () => {
      render(<AdminProductsPage />);
      const [deleteBtn] = screen.getAllByRole('button', { name: '삭제' });
      fireEvent.click(deleteBtn!);
      expect(screen.getByText(/삭제하시겠습니까/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(screen.queryByText(/삭제하시겠습니까/)).not.toBeInTheDocument();
    });

    it('삭제 다이얼로그에서 확인을 누르면 삭제 함수를 호출한다', () => {
      render(<AdminProductsPage />);
      const [deleteBtn] = screen.getAllByRole('button', { name: '삭제' });
      fireEvent.click(deleteBtn!);
      fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
      expect(mockMutate).toHaveBeenCalledWith('p1', expect.anything());
    });
  });

  describe('상품 수정 폼', () => {
    it('수정 버튼을 클릭하면 기존 상품 정보가 채워진 폼이 열린다', () => {
      render(<AdminProductsPage />);
      const [editBtn] = screen.getAllByRole('button', { name: '수정' });
      fireEvent.click(editBtn!);
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByDisplayValue('아기 원피스')).toBeInTheDocument();
      expect(within(dialog).getByDisplayValue('29000')).toBeInTheDocument();
    });
  });
});
