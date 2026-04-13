import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ProductImagesController } from './images/product-images.controller';
import { ProductImagesService } from './images/product-images.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { VariantsController } from './variants/variants.controller';
import { VariantsService } from './variants/variants.service';

@Module({
  imports: [FilesModule],
  controllers: [ProductsController, VariantsController, ProductImagesController],
  providers: [ProductsService, VariantsService, ProductImagesService],
  exports: [ProductsService, VariantsService],
})
export class ProductsModule {}
