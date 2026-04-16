import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockVariant = {
  id: 'var-1',
  productId: 'prod-1',
  sku: 'TSH-M-WHITE',
  size: 'M',
  color: '화이트',
  price: 25000,
  inventory: { quantity: 10 },
};

const mockCart = { id: 'cart-1', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() };

const mockCartItem = {
  id: 'item-1',
  cartId: 'cart-1',
  variantId: 'var-1',
  quantity: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  cart: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  cartItem: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  productVariant: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CartService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
    // $transaction 콜백을 mockPrisma를 tx로 전달하여 즉시 실행
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma),
    );
  });

  // ── getCart ──────────────────────────────────────────────────────────────────

  describe('getCart', () => {
    it('장바구니와 항목 목록을 반환한다', async () => {
      const cartWithItems = { ...mockCart, items: [mockCartItem] };
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const result = await service.getCart('user-1');

      expect(result.items).toHaveLength(1);
      expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('장바구니가 없으면 빈 항목 목록을 반환한다', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart('user-1');

      expect(result.items).toEqual([]);
    });
  });

  // ── addItem ──────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('새 항목을 추가하면 CartItem을 생성하고 반환한다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);
      mockPrisma.cartItem.create.mockResolvedValue(mockCartItem);

      const result = await service.addItem('user-1', { variantId: 'var-1', quantity: 2 });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.cartItem.create).toHaveBeenCalled();
      expect(result).toEqual(mockCartItem);
    });

    it('동일 변형 재추가 시 수량을 합산한다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant); // stock: 10
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue({ ...mockCartItem, quantity: 3 }); // 기존 3개
      mockPrisma.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 5 });

      const result = await service.addItem('user-1', { variantId: 'var-1', quantity: 2 });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 5 } }),
      );
      expect(result.quantity).toBe(5);
    });

    it('재고를 초과하는 수량 추가 시 BadRequestException을 던진다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        inventory: { quantity: 5 },
      });
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.addItem('user-1', { variantId: 'var-1', quantity: 10 })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('기존 수량 + 추가 수량이 재고 초과 시 BadRequestException을 던진다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue({
        ...mockVariant,
        inventory: { quantity: 5 },
      });
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findUnique.mockResolvedValue({ ...mockCartItem, quantity: 4 }); // 기존 4개

      await expect(service.addItem('user-1', { variantId: 'var-1', quantity: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 변형 추가 시 NotFoundException을 던진다', async () => {
      mockPrisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem('user-1', { variantId: 'nonexistent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateItem ───────────────────────────────────────────────────────────────

  describe('updateItem', () => {
    it('수량을 변경하고 반환한다', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue({
        ...mockCartItem,
        variant: mockVariant,
      });
      mockPrisma.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 5 });

      const result = await service.updateItem('user-1', 'item-1', { quantity: 5 });

      expect(result.quantity).toBe(5);
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-1' }, data: { quantity: 5 } }),
      );
    });

    it('재고를 초과하는 수량으로 변경 시 BadRequestException을 던진다', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue({
        ...mockCartItem,
        variant: { ...mockVariant, inventory: { quantity: 3 } },
      });

      await expect(service.updateItem('user-1', 'item-1', { quantity: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 항목 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.updateItem('user-1', 'nonexistent', { quantity: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── removeItem ───────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('deleteMany로 소유권 확인과 삭제를 단일 쿼리로 처리한다', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeItem('user-1', 'item-1');

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cart: { userId: 'user-1' } },
      });
    });

    it('존재하지 않거나 다른 회원의 항목 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeItem('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── clearCart ─────────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('관계 필터로 모든 항목을 단일 쿼리로 삭제한다', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearCart('user-1');

      expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'user-1' } },
      });
    });

    it('장바구니가 없어도 오류 없이 완료된다', async () => {
      mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.clearCart('user-1')).resolves.toBeUndefined();
    });
  });
});
