import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Patch('users/:id/reject')
  @ApiOperation({ summary: '회원 거절' })
  rejectUser(
    @CurrentUser() admin: JwtPayload,
    @Param('id') userId: string,
    @Body('reason') _reason: string,
  ): Promise<User> {
    return this.adminService.rejectUser(admin.sub, userId);
  }
}
