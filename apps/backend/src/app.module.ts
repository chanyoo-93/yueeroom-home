import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
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
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
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
    PaymentsModule,
    WishlistsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    // 전역 Guards: Throttler → JWT 인증 → 상태 확인 순서
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserStatusGuard },
  ],
})
export class AppModule {}
