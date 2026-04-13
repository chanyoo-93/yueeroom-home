import { describe, it, expect } from 'vitest';
import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('products.all은 고정 키를 반환한다', () => {
    expect(queryKeys.products.all).toEqual(['products']);
  });

  it('products.list는 필터 파라미터를 포함한 키를 반환한다', () => {
    const filters = { page: 1, limit: 20 };
    expect(queryKeys.products.list(filters)).toEqual(['products', 'list', filters]);
  });

  it('products.detail은 id를 포함한 키를 반환한다', () => {
    expect(queryKeys.products.detail('prod-1')).toEqual(['products', 'detail', 'prod-1']);
  });

  it('products.search는 쿼리를 포함한 키를 반환한다', () => {
    expect(queryKeys.products.search('티셔츠')).toEqual(['products', 'search', '티셔츠']);
  });

  it('categories.all은 고정 키를 반환한다', () => {
    expect(queryKeys.categories.all).toEqual(['categories']);
  });

  it('auth.me는 고정 키를 반환한다', () => {
    expect(queryKeys.auth.me).toEqual(['auth', 'me']);
  });
});
