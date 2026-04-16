import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CategoriesModule } from './categories/categories.module';
import { WishlistsModule } from './wishlists/wishlists.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { UserStatusGuard } from './common/guards/user-status.guard';
import { EmailModule } from './email/email.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
    EmailModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CategoriesModule,
    InventoryModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    WishlistsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 Guards: JWT 인증 → 미인증 차단 (#12)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserStatusGuard },
  ],
})
export class AppModule {}
