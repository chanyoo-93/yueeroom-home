import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from './inventory.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockInventory = {
  id: 'inv-1',
  variantId: 'var-1',
  quantity: 10,
  updatedAt: new Date(),
  variant: { id: 'var-1', sku: 'TSH-M-WHITE', size: 'M', color: '화이트' },
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  inventory: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockEmailService = {
  sendLowStockEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined), // LOW_STOCK_THRESHOLD 미설정 → 기본값 5
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
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
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
});
