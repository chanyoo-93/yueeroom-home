import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '주문 생성' })
  createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 주문 목록 조회' })
  getOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.getOrders(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  getOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.getOrder(user.sub, id);
  }
}
