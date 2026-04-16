import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WishlistsService } from './wishlists.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  name: '베이비 블루 롬퍼',
  basePrice: 29000,
  images: [{ id: 'img-1', url: 'https://example.com/img.jpg', order: 0 }],
};

const mockWishlistItem = {
  id: 'wish-1',
  userId: 'user-1',
  productId: 'prod-1',
  createdAt: new Date(),
  product: mockProduct,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
  },
  wishlistItem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WishlistsService', () => {
  let service: WishlistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WishlistsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<WishlistsService>(WishlistsService);
    jest.clearAllMocks();
  });

  // ── addItem ──────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('위시리스트에 상품을 추가하면 WishlistItem을 반환한다 (201)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(null);
      mockPrisma.wishlistItem.create.mockResolvedValue(mockWishlistItem);

      const result = await service.addItem('user-1', 'prod-1');

      expect(mockPrisma.wishlistItem.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', productId: 'prod-1' },
      });
      expect(result).toEqual(mockWishlistItem);
    });

    it('이미 위시리스트에 있는 상품 추가 시 ConflictException을 던진다 (409)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.wishlistItem.findUnique.mockResolvedValue(mockWishlistItem);

      await expect(service.addItem('user-1', 'prod-1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('존재하지 않는 상품 추가 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.wishlistItem.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.wishlistItem.create).not.toHaveBeenCalled();
    });
  });

  // ── removeItem ───────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('위시리스트에서 상품을 삭제한다 (204)', async () => {
      mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeItem('user-1', 'prod-1');

      expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'prod-1' },
      });
    });

    it('위시리스트에 없는 상품 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeItem('user-1', 'prod-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getWishlist ──────────────────────────────────────────────────────────────

  describe('getWishlist', () => {
    it('사용자의 위시리스트 목록을 반환한다', async () => {
      mockPrisma.wishlistItem.findMany.mockResolvedValue([mockWishlistItem]);

      const result = await service.getWishlist('user-1');

      expect(mockPrisma.wishlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockWishlistItem);
    });

    it('위시리스트가 비어있으면 빈 배열을 반환한다', async () => {
      mockPrisma.wishlistItem.findMany.mockResolvedValue([]);

      const result = await service.getWishlist('user-1');

      expect(result).toEqual([]);
    });
  });
});
