/*
  Warnings:

  - You are about to drop the column `low_stock_threshold` on the `inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "low_stock_threshold",
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;
