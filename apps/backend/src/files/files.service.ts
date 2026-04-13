import { BadRequestException, Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

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
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
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
