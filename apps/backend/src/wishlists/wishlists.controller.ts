import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { WishlistsService } from './wishlists.service';

@Controller('wishlist')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  getWishlist(@CurrentUser() user: JwtPayload) {
    return this.wishlistsService.getWishlist(user.sub);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  addItem(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.wishlistsService.addItem(user.sub, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.wishlistsService.removeItem(user.sub, productId);
  }
}
