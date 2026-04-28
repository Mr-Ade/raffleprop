-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedBy" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedBy" TEXT,
ADD COLUMN     "kycDocumentKey" TEXT,
ADD COLUMN     "kycIdType" TEXT,
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3);
