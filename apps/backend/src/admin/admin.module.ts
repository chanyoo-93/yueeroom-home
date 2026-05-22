import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [EmailModule, ProductsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
