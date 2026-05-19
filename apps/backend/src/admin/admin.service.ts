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

export interface DailySalesRow {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface MonthlySalesRow {
  month: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductRow {
  id: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
}

export interface SalesStatsResponse {
  daily: DailySalesRow[];
  monthly: MonthlySalesRow[];
  topProducts: TopProductRow[];
}

export interface OrderStatsResponse {
  statusBreakdown: Record<string, number>;
  totalOrders: number;
  pendingUsersCount: number;
}

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

  async listPendingUsers(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: USER_SAFE_SELECT,
    });
  }

  async listUsers(status?: UserStatus): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'asc' },
      select: USER_SAFE_SELECT,
    });
  }

  async getSalesStats(): Promise<SalesStatsResponse> {
    type RawDailyRow = { date: string; revenue: bigint; orderCount: bigint };
    type RawMonthlyRow = { month: string; revenue: bigint; orderCount: bigint };
    type RawTopProductRow = { id: string; name: string; totalSold: bigint; totalRevenue: bigint };

    const [daily, monthly, topProducts] = await Promise.all([
      this.prisma.$queryRaw<RawDailyRow[]>`
        SELECT
          DATE("createdAt")::text AS date,
          SUM("totalAmount") AS revenue,
          COUNT(id) AS "orderCount"
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          AND status NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
      this.prisma.$queryRaw<RawMonthlyRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
          SUM("totalAmount") AS revenue,
          COUNT(id) AS "orderCount"
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          AND status NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      `,
      this.prisma.$queryRaw<RawTopProductRow[]>`
        SELECT
          p.id,
          p.name,
          SUM(oi.quantity)::bigint AS "totalSold",
          SUM(oi.quantity * oi."unitPrice")::bigint AS "totalRevenue"
        FROM order_items oi
        JOIN orders o ON oi."orderId" = o.id
        JOIN product_variants pv ON oi."variantId" = pv.id
        JOIN products p ON pv."productId" = p.id
        WHERE o."createdAt" >= NOW() - INTERVAL '30 days'
          AND o.status NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY p.id, p.name
        ORDER BY "totalSold" DESC
        LIMIT 5
      `,
    ]);

    const dailyMap = new Map(
      daily.map((r) => [r.date, { revenue: Number(r.revenue), orderCount: Number(r.orderCount) }]),
    );
    const filledDaily: DailySalesRow[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const existing = dailyMap.get(date);
      return { date, revenue: existing?.revenue ?? 0, orderCount: existing?.orderCount ?? 0 };
    });

    return {
      daily: filledDaily,
      monthly: monthly.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
        orderCount: Number(r.orderCount),
      })),
      topProducts: topProducts.map((r) => ({
        id: r.id,
        name: r.name,
        totalSold: Number(r.totalSold),
        totalRevenue: Number(r.totalRevenue),
      })),
    };
  }

  async getOrderStats(): Promise<OrderStatsResponse> {
    const [statusCounts, totalOrders, pendingUsersCount] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { status: UserStatus.PENDING } }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const item of statusCounts) {
      statusBreakdown[item.status] = item._count.id;
    }

    return { statusBreakdown, totalOrders, pendingUsersCount };
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
