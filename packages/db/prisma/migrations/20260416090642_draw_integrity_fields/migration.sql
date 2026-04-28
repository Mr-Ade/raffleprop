/*
  Warnings:

  - Added the required column `initiatedBy` to the `draws` table without a default value. This is not possible if the table is not empty.
  - Made the column `witnessName` on table `draws` required. This step will fail if there are existing NULL values in that column.
  - Made the column `witnessTitle` on table `draws` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "draws" ADD COLUMN     "initiatedBy" TEXT NOT NULL,
ADD COLUMN     "randomOrgResponse" JSONB,
ADD COLUMN     "seedCommitment" TEXT,
ADD COLUMN     "ticketCount" INTEGER,
ALTER COLUMN "witnessName" SET NOT NULL,
ALTER COLUMN "witnessTitle" SET NOT NULL;
