import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductImage } from '@prisma/client';
import { FilesService } from '../../files/files.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async uploadImage(productId: string, file: Express.Multer.File): Promise<ProductImage> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);

    const { url, key } = await this.filesService.uploadImage(file, 'products');

    try {
      return await this.prisma.productImage.create({
        data: { productId, url, key },
      });
    } catch (error) {
      await this.filesService.deleteFile(key);
      throw error;
    }
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(`이미지를 찾을 수 없습니다: ${imageId}`);
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });

    try {
      await this.filesService.deleteFile(image.key);
    } catch (error) {
      this.logger.error(`S3 파일 삭제 실패 (key: ${image.key}): ${String(error)}`);
    }
  }
}
