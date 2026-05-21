import { BadRequestException, Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

// Keep this list in sync with validateMagicNumber.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  key: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') ?? 'ap-northeast-2',
    });
    this.bucket = this.configService.get<string>('S3_BUCKET_NAME') ?? '';
    this.cdnUrl = this.configService.get<string>('CDN_URL') ?? '';
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다. jpg, png, webp만 가능합니다.`);
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('파일 크기는 5MB를 초과할 수 없습니다.');
    }

    this.validateMagicNumber(file.buffer, file.mimetype);

    const ext = extname(file.originalname).toLowerCase() || `.${file.mimetype.split('/')[1]}`;
    const key = `${folder}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`S3 업로드 실패: ${String(error)}`);
      throw error;
    }

    return { url: `${this.cdnUrl}/${key}`, key };
  }

  private validateMagicNumber(buffer: Buffer, mimetype: string): void {
    let isValid = false;

    if (mimetype === 'image/jpeg') {
      isValid =
        buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    } else if (mimetype === 'image/png') {
      isValid =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    } else if (mimetype === 'image/webp') {
      isValid =
        buffer.length >= 12 &&
        buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
        buffer.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]));
    }

    if (!isValid) {
      throw new BadRequestException('파일 내용이 선언된 이미지 형식과 일치하지 않습니다.');
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`S3 삭제 실패: ${String(error)}`);
      throw error;
    }
  }
}
