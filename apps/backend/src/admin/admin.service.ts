import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Order, OrderStatus, User, UserRole, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async approveUser(adminId: string, targetUserId: string): Promise<User> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('PENDING 상태의 회원만 승인할 수 있습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.APPROVED },
    });

    await this.emailService.sendApprovalEmail(updated.email, updated.name);
    return updated;
  }

  async rejectUser(adminId: string, targetUserId: string): Promise<User> {
    await this.assertAdmin(adminId);
    const target = await this.getTarget(targetUserId);

    if (target.status !== UserStatus.PENDING) {
      throw new BadRequestException('PENDING 상태의 회원만 거절할 수 있습니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.REJECTED },
    });

    await this.emailService.sendRejectionEmail(updated.email, updated.name);
    return updated;
  }

  async updateOrderStatus(
    adminId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    await this.assertAdmin(adminId);

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');

    const IMMUTABLE_STATUSES: OrderStatus[] = [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ];
    if (IMMUTABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('완료·취소·환불된 주문의 상태는 변경할 수 없습니다.');
    }

    if (dto.status === OrderStatus.SHIPPING && (!dto.carrier || !dto.trackingNumber)) {
      throw new BadRequestException('배송 중 상태로 변경하려면 택배사와 송장번호가 필요합니다.');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.carrier !== undefined && { carrier: dto.carrier }),
        ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
      },
    });
  }

  async listPendingUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { status: UserStatus.PENDING },
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
