import { BadRequestException, NotFoundException } from '@nestjs/common';
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

      // limit+1 조회로 hasNext 판단하므로 take=21
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 21 }),
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

    it('categoryId 필터를 쿼리에 반영한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({ categoryId: 'cat-1' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoryId: 'cat-1' }) }),
      );
    });

    it('minPrice, maxPrice 가격 범위 필터를 쿼리에 반영한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({ minPrice: 10000, maxPrice: 50000 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: { gte: 10000, lte: 50000 },
          }),
        }),
      );
    });

    it('size 필터 — 해당 사이즈 변형을 보유한 상품만 조회한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({ size: 'M' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variants: { some: { size: 'M' } },
          }),
        }),
      );
    });

    it('sort=price_asc이면 [basePrice asc, id desc] 배열로 정렬한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({ sort: 'price_asc' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ basePrice: 'asc' }, { id: 'desc' }] }),
      );
    });

    it('sort=price_desc이면 [basePrice desc, id desc] 배열로 정렬한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({ sort: 'price_desc' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ basePrice: 'desc' }, { id: 'desc' }] }),
      );
    });

    it('sort 미지정이면 [createdAt desc, id desc] 배열로 정렬한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      await service.findAll({});

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
      );
    });

    it('cursor를 제공하면 cursor 기반 페이지네이션을 사용하고 nextCursor를 반환한다', async () => {
      // limit=1, take=limit+1=2 조회했는데 1개만 오면 nextCursor=null
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAll({ cursor: 'prod-0', limit: 1 });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'prod-0' }, skip: 1, take: 2 }),
      );
      expect(result).toHaveProperty('nextCursor');
    });

    it('offset 모드에서도 nextCursor를 반환한다', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('nextCursor');
    });

    it('minPrice가 maxPrice보다 크면 BadRequestException을 던진다', async () => {
      await expect(service.findAll({ minPrice: 50000, maxPrice: 10000 })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
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
    it('variants 없이 상품을 생성하고 반환한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create({
        categoryId: 'cat-1',
        name: '아동 티셔츠',
        basePrice: 25000,
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: '아동 티셔츠' }) }),
      );
      expect(result).toEqual(mockProduct);
    });

    it('variants를 포함하면 중첩 create로 상품+variant를 원자적으로 생성한다', async () => {
      const mockProductWithVariants = {
        ...mockProduct,
        variants: [{ id: 'var-1', size: '80', color: '블루', price: 25000, sku: '80-BLUE' }],
      };
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.product.create.mockResolvedValue(mockProductWithVariants);

      const result = await service.create({
        categoryId: 'cat-1',
        name: '아동 티셔츠',
        basePrice: 25000,
        variants: [{ size: '80', color: '블루', price: 25000, sku: '80-BLUE' }],
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variants: {
              create: expect.arrayContaining([expect.objectContaining({ sku: '80-BLUE' })]),
            },
          }),
        }),
      );
      expect(result).toEqual(mockProductWithVariants);
    });

    it('빈 variants 배열은 variants 중첩 create 없이 상품만 생성한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create({
        categoryId: 'cat-1',
        name: '아동 티셔츠',
        basePrice: 25000,
        variants: [],
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ variants: undefined }),
        }),
      );
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
    it('키워드로 상품을 검색하여 { data, total } 형태로 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([mockProduct]);

      const result = await service.search('티셔츠');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('일치하는 상품이 없으면 { data: [], total: 0 }을 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.search('존재하지않는상품');

      expect(result).toEqual({ data: [], total: 0 });
    });

    it('빈 검색어는 DB 조회 없이 { data: [], total: 0 }을 반환한다', async () => {
      const result = await service.search('');

      expect(result).toEqual({ data: [], total: 0 });
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('공백만 있는 검색어는 DB 조회 없이 { data: [], total: 0 }을 반환한다', async () => {
      const result = await service.search('   ');

      expect(result).toEqual({ data: [], total: 0 });
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
