-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AWAITING_DEPOSIT';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "virtualAccountNumber" TEXT,
ADD COLUMN     "virtualBankName" TEXT,
ADD COLUMN     "virtualAccountExpiry" TIMESTAMP(3);
