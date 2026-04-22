import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockInventory = {
  id: 'inv-1',
  variantId: 'var-1',
  quantity: 10,
  lowStockThreshold: 5,
  updatedAt: new Date(),
  variant: { id: 'var-1', sku: 'TSH-M-WHITE', size: 'M', color: '화이트' },
};

const mockInventoryList = [
  {
    id: 'inv-1',
    variantId: 'var-1',
    quantity: 3,
    lowStockThreshold: 5,
    updatedAt: new Date(),
    variant: {
      id: 'var-1',
      sku: 'TSH-M-WHITE',
      size: 'M',
      color: '화이트',
      price: 29000,
      product: { id: 'prod-1', name: '기본 티셔츠' },
    },
  },
  {
    id: 'inv-2',
    variantId: 'var-2',
    quantity: 20,
    lowStockThreshold: 5,
    updatedAt: new Date(),
    variant: {
      id: 'var-2',
      sku: 'TSH-L-BLACK',
      size: 'L',
      color: '블랙',
      price: 29000,
      product: { id: 'prod-1', name: '기본 티셔츠' },
    },
  },
];

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  inventory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockEmailService = {
  sendLowStockEmail: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('전체 재고 목록을 반환한다', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue(mockInventoryList);

      const result = await service.findAll();

      expect(result).toEqual(mockInventoryList);
      expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { quantity: 'asc' } }),
      );
    });
  });

  // ── findByVariant ─────────────────────────────────────────────────────────────

  describe('findByVariant', () => {
    it('재고 정보를 반환한다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);

      const result = await service.findByVariant('var-1');

      expect(result).toEqual(mockInventory);
      expect(mockPrisma.inventory.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { variantId: 'var-1' } }),
      );
    });

    it('존재하지 않는 변형의 재고 조회 시 NotFoundException을 던진다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.findByVariant('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateQuantity ────────────────────────────────────────────────────────────

  describe('updateQuantity', () => {
    it('재고 수량을 수정하고 반환한다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({ ...mockInventory, quantity: 20 });

      const result = await service.updateQuantity('var-1', { quantity: 20 });

      expect(result.quantity).toBe(20);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { variantId: 'var-1' } }),
      );
    });

    it('수량이 0 미만이면 BadRequestException을 던진다', async () => {
      await expect(service.updateQuantity('var-1', { quantity: -1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('존재하지 않는 변형의 재고 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.updateQuantity('nonexistent', { quantity: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('수량이 임계값(5) 이하로 떨어지면 저재고 이메일을 발송한다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({ ...mockInventory, quantity: 3 });

      await service.updateQuantity('var-1', { quantity: 3 });

      expect(mockEmailService.sendLowStockEmail).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'TSH-M-WHITE', quantity: 3 }),
      );
    });

    it('수량이 임계값(5) 초과이면 저재고 이메일을 발송하지 않는다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({ ...mockInventory, quantity: 10 });

      await service.updateQuantity('var-1', { quantity: 10 });

      expect(mockEmailService.sendLowStockEmail).not.toHaveBeenCalled();
    });

    it('이미 임계값 이하인 상태에서 더 낮춰도 저재고 이메일을 발송하지 않는다', async () => {
      const alreadyLow = { ...mockInventory, quantity: 3 };
      mockPrisma.inventory.findUnique.mockResolvedValue(alreadyLow);
      mockPrisma.inventory.update.mockResolvedValue({ ...alreadyLow, quantity: 2 });

      await service.updateQuantity('var-1', { quantity: 2 });

      expect(mockEmailService.sendLowStockEmail).not.toHaveBeenCalled();
    });
  });

  // ── updateThreshold ───────────────────────────────────────────────────────────

  describe('updateThreshold', () => {
    it('임계값을 수정하고 반환한다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(mockInventory);
      mockPrisma.inventory.update.mockResolvedValue({ ...mockInventory, lowStockThreshold: 10 });

      const result = await service.updateThreshold('var-1', { lowStockThreshold: 10 });

      expect(result.lowStockThreshold).toBe(10);
      expect(mockPrisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: 'var-1' },
          data: { lowStockThreshold: 10 },
        }),
      );
    });

    it('존재하지 않는 변형의 임계값 수정 시 NotFoundException을 던진다', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateThreshold('nonexistent', { lowStockThreshold: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
