import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockRootCategory = {
  id: 'cat-1',
  name: '상의',
  slug: 'tops',
  parentId: null,
  displayOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  children: [],
};

const mockSubCategory = {
  id: 'cat-2',
  name: '티셔츠',
  slug: 'tshirts',
  parentId: 'cat-1',
  displayOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  children: [],
};

const mockCategoryWithCount = (products: number, children: number) => ({
  ...mockRootCategory,
  _count: { products, children },
});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('최상위 카테고리를 children 포함 2depth 트리 구조로 반환한다', async () => {
      const tree = [{ ...mockRootCategory, children: [mockSubCategory] }];
      mockPrisma.category.findMany.mockResolvedValue(tree);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { parentId: null } }),
      );
      expect(result).toEqual(tree);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('카테고리를 생성하고 반환한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockRootCategory);

      const result = await service.create({ name: '상의', slug: 'tops' });

      expect(mockPrisma.category.create).toHaveBeenCalled();
      expect(result).toEqual(mockRootCategory);
    });

    it('slug를 제공하지 않으면 name으로 자동 생성한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockRootCategory);

      await service.create({ name: '상의' });

      const createCall = mockPrisma.category.create.mock.calls[0] as [{ data: { slug: string } }];
      expect(createCall[0].data.slug).toBeDefined();
    });

    it('중복 slug로 생성 시 BadRequestException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockRootCategory);

      await expect(service.create({ name: '상의', slug: 'tops' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('카테고리를 수정하고 반환한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockRootCategory);
      mockPrisma.category.update.mockResolvedValue({ ...mockRootCategory, name: '아우터' });

      const result = await service.update('cat-1', { name: '아우터' });

      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cat-1' } }),
      );
      expect(result.name).toBe('아우터');
    });

    it('존재하지 않는 카테고리 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: '변경' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('수정 시 이미 다른 카테고리가 사용 중인 slug면 BadRequestException을 던진다', async () => {
      // findOneOrFail 호출 → 대상 카테고리 반환
      // slug 중복 체크 → 다른 카테고리(cat-99)가 해당 slug 사용 중
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(mockRootCategory) // findOneOrFail
        .mockResolvedValueOnce({ ...mockSubCategory, id: 'cat-99', slug: 'used-slug' }); // slug check

      await expect(service.update('cat-1', { slug: 'used-slug' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('자신의 slug로 수정 시 BadRequestException을 던지지 않는다', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(mockRootCategory) // findOneOrFail
        .mockResolvedValueOnce(mockRootCategory); // slug check (same id)
      mockPrisma.category.update.mockResolvedValue(mockRootCategory);

      await expect(service.update('cat-1', { slug: 'tops' })).resolves.not.toThrow();
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('상품과 하위 카테고리가 없는 카테고리를 삭제한다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategoryWithCount(0, 0));
      mockPrisma.category.delete.mockResolvedValue(mockRootCategory);

      await service.remove('cat-1');

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('존재하지 않는 카테고리 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('연결된 상품이 있는 카테고리 삭제 시 BadRequestException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategoryWithCount(3, 0));

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('하위 카테고리가 있는 카테고리 삭제 시 BadRequestException을 던진다', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategoryWithCount(0, 2));

      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });
  });
});
