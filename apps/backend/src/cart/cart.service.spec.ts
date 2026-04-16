import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { MergeCartDto } from './dto/merge-cart.dto';

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
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  productVariant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
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

  // ── mergeCart ─────────────────────────────────────────────────────────────────

  describe('mergeCart', () => {
    const cartWithItems = { ...mockCart, items: [mockCartItem] };

    it('빈 items 배열 전달 시 병합 없이 현재 장바구니를 반환한다', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const dto: MergeCartDto = { items: [] };
      const result = await service.mergeCart('user-1', dto);

      expect(mockPrisma.cart.upsert).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('서버에 없는 항목을 로컬 장바구니에서 추가한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariant]); // stock: 10
      mockPrisma.cartItem.findMany.mockResolvedValue([]); // 서버에 없음
      mockPrisma.cartItem.create.mockResolvedValue(mockCartItem);
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const dto: MergeCartDto = { items: [{ variantId: 'var-1', quantity: 2 }] };
      await service.mergeCart('user-1', dto);

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', variantId: 'var-1', quantity: 2 },
      });
    });

    it('동일 상품이 서버에 있으면 수량을 합산한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariant]); // stock: 10
      mockPrisma.cartItem.findMany.mockResolvedValue([{ ...mockCartItem, quantity: 3 }]); // 기존 3개
      mockPrisma.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 5 });
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const dto: MergeCartDto = { items: [{ variantId: 'var-1', quantity: 2 }] };
      await service.mergeCart('user-1', dto);

      // 기존 3 + 로컬 2 = 5
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 5 } }),
      );
    });

    it('합산 수량이 재고를 초과하면 재고 값으로 캡 처리한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findMany.mockResolvedValue([
        { ...mockVariant, inventory: { quantity: 5 } }, // stock: 5
      ]);
      mockPrisma.cartItem.findMany.mockResolvedValue([{ ...mockCartItem, quantity: 4 }]); // 기존 4개
      mockPrisma.cartItem.update.mockResolvedValue({ ...mockCartItem, quantity: 5 });
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const dto: MergeCartDto = { items: [{ variantId: 'var-1', quantity: 3 }] }; // 4+3=7 > 5
      await service.mergeCart('user-1', dto);

      // 재고(5)로 캡
      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: 5 } }),
      );
    });

    it('존재하지 않는 variant는 스킵하고 나머지 항목을 처리한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      // var-999는 DB에 없으므로 findMany 결과에 포함되지 않음
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariant]); // var-1만 반환
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cartItem.create.mockResolvedValue(mockCartItem);
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      const dto: MergeCartDto = {
        items: [
          { variantId: 'var-999', quantity: 1 },
          { variantId: 'var-1', quantity: 2 },
        ],
      };
      await service.mergeCart('user-1', dto);

      // var-999는 스킵, var-1만 추가
      expect(mockPrisma.cartItem.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ variantId: 'var-1' }) }),
      );
    });

    it('재고가 0인 항목은 스킵한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findMany.mockResolvedValue([
        { ...mockVariant, inventory: { quantity: 0 } },
      ]);
      mockPrisma.cartItem.findMany.mockResolvedValue([]);
      mockPrisma.cart.findUnique.mockResolvedValue({ ...mockCart, items: [] });

      const dto: MergeCartDto = { items: [{ variantId: 'var-1', quantity: 1 }] };
      await service.mergeCart('user-1', dto);

      expect(mockPrisma.cartItem.create).not.toHaveBeenCalled();
      expect(mockPrisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('dto.items에 중복 variantId가 있으면 수량을 미리 합산하여 처리한다', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariant]); // stock: 10
      mockPrisma.cartItem.findMany.mockResolvedValue([]); // 서버에 없음
      mockPrisma.cartItem.create.mockResolvedValue(mockCartItem);
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItems);

      // var-1이 두 번 등장: 2 + 3 = 5
      const dto: MergeCartDto = {
        items: [
          { variantId: 'var-1', quantity: 2 },
          { variantId: 'var-1', quantity: 3 },
        ],
      };
      await service.mergeCart('user-1', dto);

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', variantId: 'var-1', quantity: 5 },
      });
    });
  });
});
