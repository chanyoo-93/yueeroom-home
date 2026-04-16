import { BadRequestException, NotFoundException } from '@nestjs/common';
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

const mockVariantA = {
  id: 'var-a',
  productId: 'prod-1',
  sku: 'PROD-A-M',
  size: 'M',
  color: '화이트',
  price: 25000,
  inventory: { quantity: 10 },
};

const mockVariantB = {
  id: 'var-b',
  productId: 'prod-2',
  sku: 'PROD-B-S',
  size: 'S',
  color: '블랙',
  price: 30000,
  inventory: { quantity: 5 },
};

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
    create: jest.fn(),
  },
  productVariant: {
    findMany: jest.fn(),
  },
  inventory: {
    update: jest.fn(),
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

    it('주문을 생성하고 재고를 차감한다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariantA, mockVariantB]);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.createOrder('user-1', validDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // 재고 차감 검증: var-a는 10-2=8, var-b는 5-1=4
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-a' },
        data: { quantity: 8 },
      });
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-b' },
        data: { quantity: 4 },
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

    it('재고가 부족하면 BadRequestException을 던진다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([
        { ...mockVariantA, inventory: { quantity: 1 } }, // 재고: 1, 요청: 2
        mockVariantB,
      ]);

      await expect(service.createOrder('user-1', validDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
      expect(mockPrisma.inventory.update).not.toHaveBeenCalled();
    });

    it('재고가 정확히 요청 수량과 같으면 주문이 성공한다', async () => {
      mockPrisma.address.findUnique.mockResolvedValue(mockAddress);
      mockPrisma.productVariant.findMany.mockResolvedValue([
        { ...mockVariantA, inventory: { quantity: 2 } }, // 재고: 2, 요청: 2 (정확히 일치)
        mockVariantB,
      ]);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      await expect(service.createOrder('user-1', validDto)).resolves.toBeDefined();
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-a' },
        data: { quantity: 0 },
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
      // var-a만 반환, var-b는 없음
      mockPrisma.productVariant.findMany.mockResolvedValue([mockVariantA]);

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

    it('다른 사용자의 주문 → NotFoundException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, userId: 'other-user' });

      await expect(service.getOrder('user-1', 'order-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getOrders ─────────────────────────────────────────────────────────────────

  describe('getOrders', () => {
    it('사용자의 주문 목록을 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getOrders('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('주문이 없으면 빈 배열을 반환한다', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getOrders('user-1');

      expect(result).toEqual([]);
    });
  });
});
