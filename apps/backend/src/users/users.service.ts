import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Address, ChildProfile, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateChildProfileDto, UpdateChildProfileDto } from './dto/child-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// 클라이언트에 노출해도 안전한 사용자 타입 (password, mfaSecret, providerId 제외)
export type SafeUser = Omit<User, 'password' | 'mfaSecret' | 'providerId'>;

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  status: true,
  role: true,
  provider: true,
  mfaEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 프로필 조회 ────────────────────────────────────────────────────────────

  /** 내부 전용 — password 등 민감 필드 포함 */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  /** API 응답용 — 민감 필드(password, mfaSecret, providerId) 제외 */
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // ── 프로필 수정 ────────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    await this.findById(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: USER_SAFE_SELECT,
    });
  }

  // ── 비밀번호 변경 ──────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findById(userId);

    if (!user.password) {
      throw new ForbiddenException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  }

  // ── 자녀 정보 ──────────────────────────────────────────────────────────────

  async getChildren(userId: string): Promise<ChildProfile[]> {
    return this.prisma.childProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addChild(userId: string, dto: CreateChildProfileDto): Promise<ChildProfile> {
    return this.prisma.childProfile.create({
      data: { ...dto, birthDate: new Date(dto.birthDate), userId },
    });
  }

  async updateChild(
    userId: string,
    childId: string,
    dto: UpdateChildProfileDto,
  ): Promise<ChildProfile> {
    await this.findChildOrFail(userId, childId);
    return this.prisma.childProfile.update({
      where: { id: childId },
      data: { ...dto, ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}) },
    });
  }

  async removeChild(userId: string, childId: string): Promise<void> {
    await this.findChildOrFail(userId, childId);
    await this.prisma.childProfile.delete({ where: { id: childId } });
  }

  private async findChildOrFail(userId: string, childId: string): Promise<ChildProfile> {
    const child = await this.prisma.childProfile.findUnique({ where: { id: childId } });
    if (!child || child.userId !== userId) {
      throw new NotFoundException('자녀 정보를 찾을 수 없습니다.');
    }
    return child;
  }

  // ── 배송지 ─────────────────────────────────────────────────────────────────

  async getAddresses(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      // 첫 배송지는 자동으로 기본 배송지
      const count = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault ?? count === 0;

      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({ data: { ...dto, isDefault, userId } });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    await this.findAddressOrFail(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({ where: { id: addressId }, data: dto });
    });
  }

  async removeAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.findAddressOrFail(userId, addressId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      // 기본 배송지를 삭제했을 경우 남은 최신 배송지를 기본으로 승격
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });
  }

  private async findAddressOrFail(userId: string, addressId: string): Promise<Address> {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('배송지를 찾을 수 없습니다.');
    }
    return address;
  }
}
