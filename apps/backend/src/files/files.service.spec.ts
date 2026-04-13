import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3') as Record<string, unknown>;
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      AWS_REGION: 'ap-northeast-2',
      AWS_ACCESS_KEY_ID: 'test-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret',
      S3_BUCKET_NAME: 'test-bucket',
      CDN_URL: 'https://cdn.yueeroom.com',
    };
    return config[key];
  }),
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeFile = (mimetype: string, size: number, originalname = 'test.jpg'): Express.Multer.File =>
  ({
    originalname,
    mimetype,
    size,
    buffer: Buffer.from('fake-image-data'),
  }) as Express.Multer.File;

const VALID_FILE = makeFile('image/jpeg', 1024 * 1024); // 1MB
const LARGE_FILE = makeFile('image/jpeg', 6 * 1024 * 1024); // 6MB
const INVALID_FILE = makeFile('image/gif', 1024);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<FilesService>(FilesService);
    jest.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('유효한 이미지 파일 업로드 시 CDN URL과 S3 키를 반환한다', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.uploadImage(VALID_FILE, 'products');

      expect(result).toMatchObject({
        url: expect.stringContaining('https://cdn.yueeroom.com/products/'),
        key: expect.stringContaining('products/'),
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('허용되지 않은 파일 형식(gif) 업로드 시 BadRequestException을 던진다', async () => {
      await expect(service.uploadImage(INVALID_FILE, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('5MB 초과 파일 업로드 시 PayloadTooLargeException을 던진다', async () => {
      await expect(service.uploadImage(LARGE_FILE, 'products')).rejects.toThrow(
        PayloadTooLargeException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('png 파일을 업로드할 수 있다', async () => {
      mockSend.mockResolvedValue({});
      const pngFile = makeFile('image/png', 2 * 1024 * 1024, 'photo.png');

      const result = await service.uploadImage(pngFile, 'products');

      expect(result.url).toContain('https://cdn.yueeroom.com/products/');
    });

    it('webp 파일을 업로드할 수 있다', async () => {
      mockSend.mockResolvedValue({});
      const webpFile = makeFile('image/webp', 500 * 1024, 'photo.webp');

      const result = await service.uploadImage(webpFile, 'products');

      expect(result.url).toContain('https://cdn.yueeroom.com/products/');
    });
  });

  describe('deleteFile', () => {
    it('S3 키로 파일을 삭제한다', async () => {
      mockSend.mockResolvedValue({});

      await expect(service.deleteFile('products/abc-123.jpg')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
