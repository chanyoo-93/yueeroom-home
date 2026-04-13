import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductImagesService } from './product-images.service';

@Controller('products/:productId/images')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@Param('productId') productId: string, @UploadedFile() file: Express.Multer.File) {
    return this.productImagesService.uploadImage(productId, file);
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteImage(@Param('productId') productId: string, @Param('imageId') imageId: string) {
    return this.productImagesService.deleteImage(productId, imageId);
  }
}
