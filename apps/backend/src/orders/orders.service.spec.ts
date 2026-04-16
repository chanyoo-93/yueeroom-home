import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAddress = {
  id: 'addr-1',
  userId: 'user-1',
  name: '집',
  recipient: '홍길동',
  phone: '010-1234-5678',
  zipCode: '12345',
  address1: '서울시 강남구',
  address2: null,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// inventory 필드 불필요 — 재고 확인은 updateMany 반환값(count)으로 처리
const mockVariantA = { id: 'var-a', price: 25000 };
const mockVariantB = { id: 'var-b', price: 30000 };

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  addressId: 'addr-1',
  status: 'PENDING',
  totalAmount: 80000,
  shippingFee: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      variantId: 'var-a',
      quantity: 2,
      unitPrice: 25000,
      createdAt: new Date(),
    },
    {
      id: 'item-2',
      orderId: 'order-1',
      variantId: 'var-b',
      quantity: 1,
      unitPrice: 30000,
      createdAt: new Date(),
    },
  ],
  address: mockAddress,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  address: {
    findUnique: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  productVariant: {
    findMany: jest.fn(),
  },
  inventory: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
    // $transaction 콜백을 mockPrisma를 tx로 전달하여 즉시 실행
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma),
    );
  });

  // ── createOrder ───────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    const validDto: CreateOrderDto = {
      addressId: 'addr-1',
      items: [
        { variantId: 'var-a', quantity: 2 },
        { variantId: 'var-b', quantity: 1 },
      ],
    };

    it('주문을 생성하고 재고를 원자적으로 차감한다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariantA, mockVariantB]);
      // updateMany count: 1 → 재고 충분 (차감 성공)
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder('user-1', validDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // DB 원자적 차감 검증: decrement + gte 조건
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-a', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      });
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-b', quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });

      // 주문 생성 검증
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            addressId: 'addr-1',
            totalAmount: 80000, // 25000*2 + 30000*1
            shippingFee: 0,
          }),
        }),
      );
    });

    it('재고가 부족하면 (updateMany count=0) BadRequestException을 던진다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariantA, mockVariantB]);
      // count: 0 → DB에서 quantity >= requestedQty 조건 불충족 = 재고 부족
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.createOrder('user-1', validDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });

    it('dto.items에 중복 variantId가 있으면 합산하여 단일 updateMany로 처리한다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariantA]);
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      // var-a 가 두 번 등장: 1 + 2 = 3
      const dto: CreateOrderDto = {
        addressId: 'addr-1',
        items: [
          { variantId: 'var-a', quantity: 1 },
          { variantId: 'var-a', quantity: 2 },
        ],
      };

      await service.createOrder('user-1', dto);

      // 합산 후 단 한 번만 호출되어야 한다
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { variantId: 'var-a', quantity: { gte: 3 } },
        data: { quantity: { decrement: 3 } },
      });
    });

    it('존재하지 않는 배송지 → NotFoundException', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(null);

      await expect(service.createOrder('user-1', validDto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('다른 사용자의 배송지 → NotFoundException', async () => {
      mockPrisma.address.findUnique.mockResolvedValue({ ...mockAddress, userId: 'other-user' });

      await expect(service.createOrder('user-1', validDto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('존재하지 않는 변형 → NotFoundException', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      // var-nonexistent 는 DB에 없으므로 findMany 결과에 포함되지 않음
      mockPrisma.productVariant.findMany.mockResolvedValue([]);

      const dto: CreateOrderDto = {
        addressId: 'addr-1',
        items: [{ variantId: 'var-nonexistent', quantity: 1 }],
      };

      await expect(service.createOrder('user-1', dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
    });
  });

  // ── getOrder ──────────────────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('주문 상세를 반환한다', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrder('user-1', 'order-1');

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' } }),
      );
    });

    it('존재하지 않는 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrder('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 주문 → ForbiddenException (403)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.getOrder('user-1', 'order-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getOrders ─────────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    it('사용자의 주문 목록을 페이지네이션하여 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.getOrders('user-1');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 10 }),
      );
    });

    it('주문이 없으면 빈 items를 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const result = await service.getOrders('user-1');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('page/limit 파라미터에 따라 올바른 skip을 계산한다', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(25);

      const result = await service.getOrders('user-1', 3, 5);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5); // ceil(25/5)
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('본인 주문만 조회된다 (where 조건 확인)', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);
      mockPrisma.order.count.mockResolvedValue(1);

      await service.getOrders('user-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(mockPrisma.order.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });
});
