import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

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
