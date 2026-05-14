-- AlterTable: productCode를 nullable로 추가 후 기존 상품 backfill, 이후 NOT NULL 적용
ALTER TABLE "products" ADD COLUMN "productCode" TEXT;
UPDATE "products"
  SET "productCode" = CONCAT('PRD', LPAD(
    CAST(ROW_NUMBER() OVER (ORDER BY "createdAt") AS TEXT), 6, '0'))
  WHERE "productCode" IS NULL;
ALTER TABLE "products" ALTER COLUMN "productCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");
