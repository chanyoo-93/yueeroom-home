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

const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const GIF_BUFFER = Buffer.from([0x47, 0x49, 0x46, 0x38]);

const makeFile = (
  mimetype: string,
  size: number,
  originalname = 'test.jpg',
  buffer = JPEG_BUFFER,
): Express.Multer.File =>
  ({
    originalname,
    mimetype,
    size,
    buffer,
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
      const pngFile = makeFile('image/png', 2 * 1024 * 1024, 'photo.png', PNG_BUFFER);

      const result = await service.uploadImage(pngFile, 'products');

      expect(result.url).toContain('https://cdn.yueeroom.com/products/');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('webp 파일을 업로드할 수 있다', async () => {
      mockSend.mockResolvedValue({});
      const webpFile = makeFile('image/webp', 500 * 1024, 'photo.webp', WEBP_BUFFER);

      const result = await service.uploadImage(webpFile, 'products');

      expect(result.url).toContain('https://cdn.yueeroom.com/products/');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('jpeg MIME으로 위장한 gif 내용 업로드 시 BadRequestException을 던진다', async () => {
      const spoofedFile = makeFile('image/jpeg', 1024, 'photo.jpg', GIF_BUFFER);

      await expect(service.uploadImage(spoofedFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('png MIME으로 위장한 jpeg 내용 업로드 시 BadRequestException을 던진다', async () => {
      const spoofedFile = makeFile('image/png', 1024, 'photo.png', JPEG_BUFFER);

      await expect(service.uploadImage(spoofedFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('webp MIME으로 위장한 png 내용 업로드 시 BadRequestException을 던진다', async () => {
      const spoofedFile = makeFile('image/webp', 1024, 'photo.webp', PNG_BUFFER);

      await expect(service.uploadImage(spoofedFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('webp 검증에 필요한 길이보다 짧은 buffer면 BadRequestException을 던진다', async () => {
      const shortWebpFile = makeFile(
        'image/webp',
        4,
        'photo.webp',
        Buffer.from([0x52, 0x49, 0x46, 0x46]),
      );

      await expect(service.uploadImage(shortWebpFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('jpeg 검증에 필요한 길이보다 짧은 buffer면 BadRequestException을 던진다', async () => {
      const shortJpegFile = makeFile('image/jpeg', 2, 'photo.jpg', Buffer.from([0xff, 0xd8]));

      await expect(service.uploadImage(shortJpegFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('png 검증에 필요한 길이보다 짧은 buffer면 BadRequestException을 던진다', async () => {
      const shortPngFile = makeFile(
        'image/png',
        7,
        'photo.png',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]),
      );

      await expect(service.uploadImage(shortPngFile, 'products')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSend).not.toHaveBeenCalled();
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
