import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  categoryId: 'cat-1',
  name: '아동 티셔츠',
  description: '편안한 면 소재',
  basePrice: 25000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProductDetail = {
  ...mockProduct,
  category: { id: 'cat-1', name: '상의', slug: 'tops' },
  variants: [],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
  productImage: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockFilesService = {
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('상품 목록과 페이지네이션 메타데이터를 반환한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('page와 limit 기본값(1, 20)이 적용된다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({});

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('isActive 필터를 쿼리에 반영한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.findAll({ isActive: false });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: false } }),
      );
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('상품 상세 정보(category, variants 포함)를 반환한다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProductDetail);

      const result = await service.findOne('prod-1');

      expect(result).toEqual(mockProductDetail);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prod-1' } }),
      );
    });

    it('존재하지 않는 상품 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('상품을 생성하고 반환한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create({
        categoryId: 'cat-1',
        name: '아동 티셔츠',
        basePrice: 25000,
      });

      expect(mockPrisma.product.create).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('존재하지 않는 categoryId로 생성 시 NotFoundException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ categoryId: 'invalid', name: '상품', basePrice: 10000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('상품을 수정하고 반환한다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, name: '수정된 티셔츠' });

      const result = await service.update('prod-1', { name: '수정된 티셔츠' });

      expect(result.name).toBe('수정된 티셔츠');
    });

    it('존재하지 않는 상품 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: '변경' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('존재하지 않는 categoryId로 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('prod-1', { categoryId: 'invalid' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('상품을 삭제하고 연결된 이미지를 S3에서 정리한다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productImage.findMany.mockResolvedValue([
        { key: 'products/img-1.jpg' },
        { key: 'products/img-2.jpg' },
      ]);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await service.remove('prod-1');

      expect(mockFilesService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockPrisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-1' } });
    });

    it('이미지가 없는 상품도 정상 삭제된다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productImage.findMany.mockResolvedValue([]);
      mockPrisma.product.delete.mockResolvedValue(mockProduct);

      await service.remove('prod-1');

      expect(mockFilesService.deleteFile).not.toHaveBeenCalled();
      expect(mockPrisma.product.delete).toHaveBeenCalled();
    });

    it('존재하지 않는 상품 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── search ───────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('키워드로 상품을 검색하여 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([mockProduct]);

      const result = await service.search('티셔츠');

      expect(result).toHaveLength(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('일치하는 상품이 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.search('존재하지않는상품');

      expect(result).toEqual([]);
    });

    it('빈 검색어는 DB 조회 없이 빈 배열을 반환한다', async () => {
      const result = await service.search('');

      expect(result).toEqual([]);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('공백만 있는 검색어는 DB 조회 없이 빈 배열을 반환한다', async () => {
      const result = await service.search('   ');

      expect(result).toEqual([]);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
