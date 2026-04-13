import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductImage } from '@prisma/client';
import { FilesService } from '../../files/files.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async uploadImage(productId: string, file: Express.Multer.File): Promise<ProductImage> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`상품을 찾을 수 없습니다: ${productId}`);

    const { url, key } = await this.filesService.uploadImage(file, 'products');

    return this.prisma.productImage.create({
      data: { productId, url, key },
    });
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException(`이미지를 찾을 수 없습니다: ${imageId}`);
    }

    await this.filesService.deleteFile(image.key);
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }
}
