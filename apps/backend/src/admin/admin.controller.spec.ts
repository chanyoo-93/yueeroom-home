import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OrderStatus, UserRole, UserStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';

const GUARDS_METADATA_KEY = '__guards__';

function makeContext(user?: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<
    Pick<
      AdminService,
      | 'getSalesStats'
      | 'getOrderStats'
      | 'listUsers'
      | 'listPendingUsers'
      | 'approveUser'
      | 'listOrders'
      | 'updateOrderStatus'
      | 'updateOrderTracking'
      | 'rejectUser'
      | 'suspendUser'
      | 'restoreUser'
    >
  >;
  let productsService: jest.Mocked<Pick<ProductsService, 'findAll'>>;

  beforeEach(() => {
    adminService = {
      getSalesStats: jest.fn(),
      getOrderStats: jest.fn(),
      listUsers: jest.fn(),
      listPendingUsers: jest.fn(),
      approveUser: jest.fn(),
      listOrders: jest.fn(),
      updateOrderStatus: jest.fn(),
      updateOrderTracking: jest.fn(),
      rejectUser: jest.fn(),
      suspendUser: jest.fn(),
      restoreUser: jest.fn(),
    };
    productsService = {
      findAll: jest.fn(),
    };

    controller = new AdminController(
      adminService as unknown as AdminService,
      productsService as unknown as ProductsService,
    );
  });

  it('클래스 레벨에 AdminGuard가 적용되어 있다', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, AdminController) ?? [];

    expect(guards).toContain(AdminGuard);
  });

  describe('AdminGuard authorization', () => {
    it('CUSTOMER payload를 ForbiddenException으로 거부한다', () => {
      const guard = new AdminGuard();
      const customer: JwtPayload = {
        sub: 'customer-1',
        email: 'customer@test.com',
        role: UserRole.CUSTOMER,
        status: UserStatus.APPROVED,
      };

      expect(() => guard.canActivate(makeContext(customer))).toThrow(ForbiddenException);
    });

    it('user가 없으면 ForbiddenException을 던진다', () => {
      const guard = new AdminGuard();

      expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
    });
  });

  describe('admin service method wiring', () => {
    const admin: JwtPayload = {
      sub: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    };

    it('getSalesStats는 adminService.getSalesStats 결과를 반환한다', async () => {
      const stats = {
        daily: [],
        monthly: [],
        topProducts: [],
      };
      adminService.getSalesStats.mockResolvedValue(stats);

      await expect(controller.getSalesStats()).resolves.toBe(stats);
      expect(adminService.getSalesStats).toHaveBeenCalledWith();
    });

    it('getOrderStats는 adminService.getOrderStats 결과를 반환한다', async () => {
      const stats = {
        statusBreakdown: {},
        totalOrders: 0,
        pendingUsersCount: 0,
      };
      adminService.getOrderStats.mockResolvedValue(stats);

      await expect(controller.getOrderStats()).resolves.toBe(stats);
      expect(adminService.getOrderStats).toHaveBeenCalledWith();
    });

    it('listUsers는 adminService.listUsers를 호출한다', () => {
      controller.listUsers(UserStatus.PENDING);

      expect(adminService.listUsers).toHaveBeenCalledWith(UserStatus.PENDING);
    });

    it('listPendingUsers는 adminService.listPendingUsers를 호출한다', () => {
      controller.listPendingUsers();

      expect(adminService.listPendingUsers).toHaveBeenCalledWith();
    });

    it('approveUser는 adminService.approveUser(admin.sub, userId)를 호출한다', () => {
      controller.approveUser(admin, 'user-1');

      expect(adminService.approveUser).toHaveBeenCalledWith('admin-1', 'user-1');
    });

    it('listOrders는 adminService.listOrders를 호출한다', () => {
      controller.listOrders({ page: 2, limit: 30 });

      expect(adminService.listOrders).toHaveBeenCalledWith(2, 30);
    });

    it('updateOrderStatus는 adminService.updateOrderStatus를 호출한다', () => {
      const dto = { status: OrderStatus.SHIPPING, carrier: 'CJ', trackingNumber: '123' };

      controller.updateOrderStatus(admin, 'order-1', dto);

      expect(adminService.updateOrderStatus).toHaveBeenCalledWith('admin-1', 'order-1', dto);
    });

    it('updateOrderTracking은 adminService.updateOrderTracking을 호출한다', () => {
      const dto = { carrier: 'CJ', trackingNumber: '123' };

      controller.updateOrderTracking(admin, 'order-1', dto);

      expect(adminService.updateOrderTracking).toHaveBeenCalledWith('admin-1', 'order-1', dto);
    });

    it('rejectUser는 adminService.rejectUser를 호출한다', () => {
      controller.rejectUser(admin, 'user-1', '서류 미비');

      expect(adminService.rejectUser).toHaveBeenCalledWith('admin-1', 'user-1');
    });

    it('suspendUser는 adminService.suspendUser를 호출한다', () => {
      controller.suspendUser(admin, 'user-1');

      expect(adminService.suspendUser).toHaveBeenCalledWith('admin-1', 'user-1');
    });

    it('restoreUser는 adminService.restoreUser를 호출한다', () => {
      controller.restoreUser(admin, 'user-1');

      expect(adminService.restoreUser).toHaveBeenCalledWith('admin-1', 'user-1');
    });
  });

  describe('getProducts', () => {
    it('isActive 미지정 시 공개 활성 필터 강제를 비활성화한다', () => {
      const query = { page: 1, limit: 20 };

      controller.getProducts(query);

      expect(productsService.findAll).toHaveBeenCalledWith(query, false);
    });

    it('isActive=true 지정 시 공개 활성 필터 강제를 비활성화한다', () => {
      const query = { page: 1, limit: 20, isActive: true };

      controller.getProducts(query);

      expect(productsService.findAll).toHaveBeenCalledWith(query, false);
    });

    it('isActive=false 지정 시 공개 활성 필터 강제를 비활성화한다', () => {
      const query = { page: 1, limit: 20, isActive: false };

      controller.getProducts(query);

      expect(productsService.findAll).toHaveBeenCalledWith(query, false);
    });
  });
});
