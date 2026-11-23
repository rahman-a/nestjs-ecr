-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('ADMIN', 'PARTNER', 'MERCHANT');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "type" "EmployeeType" NOT NULL DEFAULT 'MERCHANT';
