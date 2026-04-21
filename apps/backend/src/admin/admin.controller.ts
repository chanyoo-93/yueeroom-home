import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { User, Order, UserStatus } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: '회원 목록 조회 (상태 필터 가능)' })
  @ApiQuery({ name: 'status', enum: UserStatus, required: false })
  listUsers(@Query('status') status?: UserStatus): Promise<User[]> {
    return this.adminService.listUsers(status);
  }

  @Get('users/pending')
  @ApiOperation({ summary: '승인 대기 회원 목록 조회' })
  listPendingUsers(): Promise<User[]> {
    return this.adminService.listPendingUsers();
  }

  @Patch('users/:id/approve')
  @ApiOperation({ summary: '회원 승인' })
  approveUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<User> {
    return this.adminService.approveUser(admin.sub, userId);
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

  @Patch('users/:id/reject')
  @ApiOperation({ summary: '회원 거절' })
  rejectUser(
    @CurrentUser() admin: JwtPayload,
    @Param('id') userId: string,
    @Body('reason') _reason: string,
  ): Promise<User> {
    return this.adminService.rejectUser(admin.sub, userId);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: '회원 정지' })
  suspendUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<User> {
    return this.adminService.suspendUser(admin.sub, userId);
  }

  @Patch('users/:id/restore')
  @ApiOperation({ summary: '회원 복구' })
  restoreUser(@CurrentUser() admin: JwtPayload, @Param('id') userId: string): Promise<User> {
    return this.adminService.restoreUser(admin.sub, userId);
  }
}
