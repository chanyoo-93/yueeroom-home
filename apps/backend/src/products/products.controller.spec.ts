import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<Pick<ProductsService, 'findAll'>>;

  beforeEach(() => {
    productsService = {
      findAll: jest.fn(),
    };

    controller = new ProductsController(productsService as unknown as ProductsService);
  });

  describe('findAll', () => {
    it('공개 상품 목록 조회 시 기본 활성 상품 정책을 사용한다', () => {
      const query = { page: 1, limit: 20 };

      controller.findAll(query);

      expect(productsService.findAll).toHaveBeenCalledWith(query);
      expect(productsService.findAll).not.toHaveBeenCalledWith(query, false);
    });
  });
});
