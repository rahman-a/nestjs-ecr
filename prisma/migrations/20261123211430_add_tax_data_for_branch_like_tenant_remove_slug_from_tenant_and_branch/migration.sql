/*
  Warnings:

  - You are about to drop the column `slug` on the `Branch` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[rin]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rin]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceSerialNumber` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `terminalId` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activityCode` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rin` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Branch_tenantId_slug_key";

-- DropIndex
DROP INDEX "Tenant_slug_key";

-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "slug",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "clientSecret" TEXT,
ADD COLUMN     "deviceSerialNumber" TEXT NOT NULL,
ADD COLUMN     "rin" TEXT,
ADD COLUMN     "terminalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "slug",
ADD COLUMN     "activityCode" TEXT NOT NULL,
ADD COLUMN     "logoPrinting" VARCHAR(500),
ADD COLUMN     "rin" TEXT NOT NULL,
ADD COLUMN     "syndicateLicenseNumber" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_rin_key" ON "Branch"("rin");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_clientId_key" ON "Branch"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_rin_key" ON "Tenant"("rin");
