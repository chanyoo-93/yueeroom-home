import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = { id: 'prod-1', name: '티셔츠' };

const mockVariant = {
  id: 'var-1',
  productId: 'prod-1',
  size: 'M',
  color: '화이트',
  sku: 'TSH-M-WHITE',
  price: 25000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: { findUnique: jest.fn() },
  productVariant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VariantsService', () => {
  let service: VariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VariantsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('상품의 변형 목록을 반환한다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariant]);

      const result = await service.findAll('prod-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 'prod-1' } }),
      );
    });

    it('존재하지 않는 상품 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findAll('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('변형을 생성하고 반환한다', async () => {
      mockPrisma.productVariant.create.mockResolvedValue(mockVariant);

      const result = await service.create('prod-1', {
        size: 'M',
        color: '화이트',
        sku: 'TSH-M-WHITE',
        price: 25000,
      });

      expect(result).toEqual(mockVariant);
    });

    it('존재하지 않는 상품에 변형 생성 시 NotFoundException을 던진다 (P2025)', async () => {
      mockPrisma.productVariant.create.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.create('nonexistent', { size: 'M', color: '화이트', sku: 'SKU-1', price: 10000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('중복 SKU로 생성 시 ConflictException을 던진다 (P2002)', async () => {
      mockPrisma.productVariant.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create('prod-1', { size: 'L', color: '블랙', sku: 'TSH-M-WHITE', price: 25000 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('변형을 수정하고 반환한다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.productVariant.update.mockResolvedValue({ ...mockVariant, price: 30000 });

      const result = await service.update('prod-1', 'var-1', { price: 30000 });

      expect(result.price).toBe(30000);
    });

    it('존재하지 않는 변형 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.update('prod-1', 'nonexistent', { price: 10000 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('다른 변형이 사용 중인 SKU로 수정 시 ConflictException을 던진다 (P2002)', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.productVariant.update.mockRejectedValue({ code: 'P2002' });

      await expect(service.update('prod-1', 'var-1', { sku: 'DUPLICATE' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('변형을 삭제한다', async () => {
      mockPrisma.productVariant.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove('prod-1', 'var-1');

      expect(mockPrisma.productVariant.deleteMany).toHaveBeenCalledWith({
        where: { id: 'var-1', productId: 'prod-1' },
      });
    });

    it('존재하지 않는 변형 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.productVariant.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('prod-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
