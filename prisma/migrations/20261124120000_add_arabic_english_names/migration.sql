-- Rename existing (Arabic) names to nameAr, keeping the data.
ALTER TABLE "Tenant"   RENAME COLUMN "name" TO "nameAr";
ALTER TABLE "Branch"   RENAME COLUMN "name" TO "nameAr";
ALTER TABLE "Employee" RENAME COLUMN "name" TO "nameAr";

-- Add nameEn, backfill existing rows from nameAr, then make it required.
ALTER TABLE "Tenant"   ADD COLUMN "nameEn" VARCHAR(150);
ALTER TABLE "Branch"   ADD COLUMN "nameEn" VARCHAR(150);
ALTER TABLE "Employee" ADD COLUMN "nameEn" VARCHAR(150);

UPDATE "Tenant"   SET "nameEn" = "nameAr";
UPDATE "Branch"   SET "nameEn" = "nameAr";
UPDATE "Employee" SET "nameEn" = "nameAr";

ALTER TABLE "Tenant"   ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "Branch"   ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "nameEn" SET NOT NULL;
