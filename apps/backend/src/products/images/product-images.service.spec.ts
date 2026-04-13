import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductImagesService } from './product-images.service';
import { FilesService } from '../../files/files.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = { id: 'prod-1', name: '아동 티셔츠' };

const mockImage = {
  id: 'img-1',
  productId: 'prod-1',
  url: 'https://cdn.yueeroom.com/products/abc-123.jpg',
  key: 'products/abc-123.jpg',
  order: 0,
  createdAt: new Date(),
};

const makeFile = (): Express.Multer.File =>
  ({
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024 * 1024,
    buffer: Buffer.from('fake'),
  }) as Express.Multer.File;

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPrisma = {
  product: { findUnique: jest.fn() },
  productImage: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockFilesService = {
  uploadImage: jest.fn().mockResolvedValue({
    url: 'https://cdn.yueeroom.com/products/abc-123.jpg',
    key: 'products/abc-123.jpg',
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProductImagesService', () => {
  let service: ProductImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
      ],
    }).compile();

    service = module.get<ProductImagesService>(ProductImagesService);
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('이미지를 업로드하고 ProductImage 레코드를 반환한다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockFilesService.uploadImage.mockResolvedValue({
        url: 'https://cdn.yueeroom.com/products/abc-123.jpg',
        key: 'products/abc-123.jpg',
      });
      mockPrisma.productImage.create.mockResolvedValue(mockImage);

      const result = await service.uploadImage('prod-1', makeFile());

      expect(result).toEqual(mockImage);
      expect(mockFilesService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'image/jpeg' }),
        'products',
      );
      expect(mockPrisma.productImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            url: 'https://cdn.yueeroom.com/products/abc-123.jpg',
            key: 'products/abc-123.jpg',
          }),
        }),
      );
    });

    it('존재하지 않는 상품에 이미지 업로드 시 NotFoundException을 던진다', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.uploadImage('nonexistent', makeFile())).rejects.toThrow(
        NotFoundException,
      );
      expect(mockFilesService.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('deleteImage', () => {
    it('이미지를 S3와 DB에서 삭제한다', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.productImage.delete.mockResolvedValue(mockImage);

      await service.deleteImage('prod-1', 'img-1');

      expect(mockFilesService.deleteFile).toHaveBeenCalledWith('products/abc-123.jpg');
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'img-1' },
      });
    });

    it('존재하지 않는 이미지 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(null);

      await expect(service.deleteImage('prod-1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockFilesService.deleteFile).not.toHaveBeenCalled();
    });

    it('다른 상품의 이미지 삭제 시 NotFoundException을 던진다', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue({
        ...mockImage,
        productId: 'other-prod',
      });

      await expect(service.deleteImage('prod-1', 'img-1')).rejects.toThrow(NotFoundException);
    });
  });
});
