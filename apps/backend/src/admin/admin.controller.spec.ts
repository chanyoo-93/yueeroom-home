import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProductsService } from '../products/products.service';
import { AdminGuard } from '../common/guards/admin.guard';

const GUARDS_METADATA_KEY = '__guards__';

describe('AdminController', () => {
  let controller: AdminController;
  let productsService: jest.Mocked<Pick<ProductsService, 'findAll'>>;

  beforeEach(() => {
    const adminService = {} as AdminService;
    productsService = {
      findAll: jest.fn(),
    };

    controller = new AdminController(adminService, productsService as unknown as ProductsService);
  });

  it('클래스 레벨에 AdminGuard가 적용되어 있다', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA_KEY, AdminController) ?? [];

    expect(guards).toContain(AdminGuard);
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
