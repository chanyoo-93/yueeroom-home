import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, type LocalCartItem } from './cart';

function makeItem(overrides: Partial<LocalCartItem> = {}): LocalCartItem {
  return {
    id: 'item-1',
    variantId: 'variant-1',
    productId: 'prod-1',
    productName: '베이비 블루 롬퍼',
    productImageUrl: null,
    color: '블루',
    size: '80',
    price: 29000,
    quantity: 1,
    stock: 10,
    ...overrides,
  };
}

describe('useCartStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 초기화
    useCartStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('새 항목을 장바구니에 추가한다', () => {
      const item = makeItem();
      useCartStore.getState().addItem(item);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]).toMatchObject({
        variantId: 'variant-1',
        quantity: 1,
      });
    });

    it('같은 variantId가 있으면 수량을 합산한다', () => {
      const item = makeItem({ quantity: 2 });
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    });

    it('합산된 수량이 재고를 초과하지 않도록 제한한다', () => {
      const item = makeItem({ quantity: 8, stock: 10 });
      useCartStore.getState().addItem(item);
      useCartStore.getState().addItem(makeItem({ quantity: 5, stock: 10 }));
      // 8 + 5 = 13 이지만 재고 10으로 제한
      expect(useCartStore.getState().items[0]?.quantity).toBe(10);
    });

    it('다른 variantId는 별도 항목으로 추가된다', () => {
      useCartStore.getState().addItem(makeItem({ variantId: 'v1' }));
      useCartStore.getState().addItem(makeItem({ variantId: 'v2' }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('variantId에 해당하는 항목을 삭제한다', () => {
      useCartStore.getState().addItem(makeItem({ variantId: 'v1' }));
      useCartStore.getState().addItem(makeItem({ variantId: 'v2' }));
      useCartStore.getState().removeItem('v1');
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]?.variantId).toBe('v2');
    });

    it('존재하지 않는 variantId를 삭제해도 에러가 발생하지 않는다', () => {
      useCartStore.getState().addItem(makeItem());
      expect(() => useCartStore.getState().removeItem('not-exist')).not.toThrow();
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('variantId에 해당하는 항목의 수량을 변경한다', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 1 }));
      useCartStore.getState().updateQuantity('variant-1', 4);
      expect(useCartStore.getState().items[0]?.quantity).toBe(4);
    });

    it('수량은 최소 1로 제한된다', () => {
      useCartStore.getState().addItem(makeItem({ quantity: 3 }));
      useCartStore.getState().updateQuantity('variant-1', 0);
      expect(useCartStore.getState().items[0]?.quantity).toBe(1);
    });

    it('수량은 재고를 초과하지 않도록 제한된다', () => {
      useCartStore.getState().addItem(makeItem({ stock: 5 }));
      useCartStore.getState().updateQuantity('variant-1', 99);
      expect(useCartStore.getState().items[0]?.quantity).toBe(5);
    });
  });

  describe('clearCart', () => {
    it('모든 항목을 삭제한다', () => {
      useCartStore.getState().addItem(makeItem({ variantId: 'v1' }));
      useCartStore.getState().addItem(makeItem({ variantId: 'v2' }));
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('syncFromServer', () => {
    it('서버 데이터로 스토어 전체를 교체한다', () => {
      useCartStore.getState().addItem(makeItem({ variantId: 'local-v1' }));
      const serverItems: LocalCartItem[] = [
        makeItem({ variantId: 'server-v1', productName: '서버 상품' }),
      ];
      useCartStore.getState().syncFromServer(serverItems);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]?.variantId).toBe('server-v1');
    });
  });
});
