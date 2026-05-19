import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Order, UserStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminService, OrderStatsResponse, SalesStatsResponse } from './admin.service';
import { SafeUser } from '../users/users.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto';
import { GetAdminOrdersQueryDto } from './dto/get-admin-orders-query.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats/sales')
  @ApiOperation({ summary: '일별/월별 매출 통계 및 인기 상품 Top 5' })
  getSalesStats(): Promise<SalesStatsResponse> {
    return this.adminService.getSalesStats();
  }

  @Get('stats/orders')
  @ApiOperation({ summary: '주문 상태별 통계 및 승인 대기 회원 수' })
  getOrderStats(): Promise<OrderStatsResponse> {
    return this.adminService.getOrderStats();
  }

  @Get('users')
  @ApiOperation({ summary: '회원 목록 조회 (상태 필터 가능)' })
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  listUsers(@Query('status') status?: UserStatus): Promise<SafeUser[]> {
    return this.adminService.listUsers(status);
  }

  @Get('users/pending')
  @ApiOperation({ summary: '승인 대기 회원 목록 조회' })
  listPendingUsers(): Promise<SafeUser[]> {
    return this.adminService.listPendingUsers();
  }

  @Patch('users/:id/approve')
  @ApiOperation({ summary: '회원 승인' })
  approveUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<SafeUser> {
    return this.adminService.approveUser(admin.sub, userId);
  }

  @Get('orders')
  @ApiOperation({ summary: '전체 주문 목록 조회 (페이지네이션)' })
  listOrders(@Query() query: GetAdminOrdersQueryDto) {
    return this.adminService.listOrders(query.page, query.limit);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: '주문 상태 및 배송 정보 업데이트' })
  updateOrderStatus(
    @CurrentUser() admin: JwtPayload,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return this.adminService.updateOrderStatus(admin.sub, orderId, dto);
  }

  @Patch('orders/:id/tracking')
  @ApiOperation({ summary: '송장번호 입력/수정' })
  updateOrderTracking(
    @CurrentUser() admin: JwtPayload,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderTrackingDto,
  ): Promise<Order> {
    return this.adminService.updateOrderTracking(admin.sub, orderId, dto);
  }

  @Patch('users/:id/reject')
  @ApiOperation({ summary: '회원 거절' })
  rejectUser(
    @CurrentUser() admin: JwtPayload,
    @Param('id') userId: string,
    @Body('reason') _reason: string,
  ): Promise<SafeUser> {
    return this.adminService.rejectUser(admin.sub, userId);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: '회원 정지' })
  suspendUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<SafeUser> {
    return this.adminService.suspendUser(admin.sub, userId);
  }

  @Patch('users/:id/restore')
  @ApiOperation({ summary: '회원 복구' })
  restoreUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<SafeUser> {
    return this.adminService.restoreUser(admin.sub, userId);
  }
}
