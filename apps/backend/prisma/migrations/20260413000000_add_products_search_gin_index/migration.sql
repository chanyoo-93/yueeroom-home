-- 상품 전체 텍스트 검색 성능을 위한 GIN 인덱스
-- to_tsvector('simple', name || ' ' || COALESCE(description, '')) 기반 검색 쿼리에 대한 sequential scan 방지
CREATE INDEX "products_search_idx"
  ON "products"
  USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));
