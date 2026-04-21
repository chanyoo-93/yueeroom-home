import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser, USER_SAFE_SELECT } from '../users/users.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderTrackingDto } from './dto/update-order-tracking.dto';

const IMMUTABLE_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

type AdminOrderWithUser = Prisma.OrderGetPayload<{
  include: { user: { select: { id: true; email: true; name: true } } };
}>;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async approveUser(adminId: string, targetUserId: string): Promise<SafeUser> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('PENDING 상태의 회원만 승인할 수 있습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.APPROVED },
      select: USER_SAFE_SELECT,
    });

    await this.emailService.sendApprovalEmail(updated.email, updated.name);
    return updated;
  }

  async rejectUser(adminId: string, targetUserId: string): Promise<SafeUser> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('PENDING 상태의 회원만 거절할 수 있습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.REJECTED },
      select: USER_SAFE_SELECT,
    });

    await this.emailService.sendRejectionEmail(updated.email, updated.name);
    return updated;
  }

  async suspendUser(adminId: string, targetUserId: string): Promise<SafeUser> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.APPROVED) {
      throw new BadRequestException('APPROVED 상태의 회원만 정지할 수 있습니다.');
    }

    if (adminId === targetUserId) {
      throw new BadRequestException('자기 자신을 정지할 수 없습니다.');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.SUSPENDED },
      select: USER_SAFE_SELECT,
    });
  }

  async restoreUser(adminId: string, targetUserId: string): Promise<SafeUser> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException('SUSPENDED 상태의 회원만 복구할 수 있습니다.');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.APPROVED },
      select: USER_SAFE_SELECT,
    });
  }

  async updateOrderStatus(
    adminId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    await this.assertAdmin(adminId);

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    if (IMMUTABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('완료·취소·환불된 주문의 상태는 변경할 수 없습니다.');
    }

    if (dto.status === OrderStatus.SHIPPING && (!dto.carrier || !dto.trackingNumber)) {
      throw new BadRequestException('배송 중 상태로 변경하려면 택배사와 송장번호가 필요합니다.');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.carrier !== undefined && { carrier: dto.carrier }),
        ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
    if (user) {
      try {
        await this.emailService.sendOrderStatusEmail(user.email, user.name, orderId, dto.status);
      } catch (error) {
        this.logger.error(`주문 상태 변경 이메일 발송 실패 (orderId=${orderId}): ${String(error)}`);
      }
    }

    return updated;
  }

  async updateOrderTracking(
    adminId: string,
    orderId: string,
    dto: UpdateOrderTrackingDto,
  ): Promise<Order> {
    await this.assertAdmin(adminId);

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    if (IMMUTABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('완료·취소·환불된 주문의 송장번호는 변경할 수 없습니다.');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { carrier: dto.carrier, trackingNumber: dto.trackingNumber },
    });
  }

  async listOrders(
    page: number,
    limit: number,
  ): Promise<{
    items: AdminOrderWithUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.order.count(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listPendingUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listUsers(status?: UserStatus): Promise<User[]> {
    return this.prisma.user.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  private async getTarget(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }
}
