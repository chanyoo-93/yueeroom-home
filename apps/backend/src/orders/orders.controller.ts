import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { PartialRefundDto } from './dto/partial-refund.dto';
import { RefundDto } from './dto/refund.dto';
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
  @ApiOperation({ summary: '내 주문 목록 조회 (페이지네이션)' })
  getOrders(@CurrentUser() user: JwtPayload, @Query() query: GetOrdersQueryDto) {
    return this.ordersService.getOrders(user.sub, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '주문 상세 조회' })
  getOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.getOrder(user.sub, id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: '전체 환불' })
  refundOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RefundDto) {
    return this.ordersService.refundOrder(user.sub, id, dto.reason);
  }

  @Post(':id/partial-refund')
  @ApiOperation({ summary: '부분 환불' })
  partialRefundOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PartialRefundDto,
  ) {
    return this.ordersService.partialRefundOrder(user.sub, id, dto);
  }
}
