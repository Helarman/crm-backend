/*
  Warnings:

  - The values [PERSONAL,GENERAL,PROMO] on the enum `DiscountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cashbackValue` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `isCashback` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `promoCode` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `discounts` table. All the data in the column will be lost.
  - You are about to drop the column `markupId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `_DiscountCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DiscountProducts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DiscountToRestaurant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrderDiscounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `markups` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `title` to the `discounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `discounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `network_id` to the `restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnumSurchargeType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('API', 'MARKETPLACE', 'ECOMMERCE', 'POS');

-- AlterEnum
BEGIN;
CREATE TYPE "DiscountType_new" AS ENUM ('PERCENTAGE', 'FIXED');
ALTER TABLE "discounts" ALTER COLUMN "type" TYPE "DiscountType_new" USING ("type"::text::"DiscountType_new");
ALTER TYPE "DiscountType" RENAME TO "DiscountType_old";
ALTER TYPE "DiscountType_new" RENAME TO "DiscountType";
DROP TYPE "DiscountType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_DiscountCategories" DROP CONSTRAINT "_DiscountCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountCategories" DROP CONSTRAINT "_DiscountCategories_B_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountProducts" DROP CONSTRAINT "_DiscountProducts_A_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountProducts" DROP CONSTRAINT "_DiscountProducts_B_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountToRestaurant" DROP CONSTRAINT "_DiscountToRestaurant_A_fkey";

-- DropForeignKey
ALTER TABLE "_DiscountToRestaurant" DROP CONSTRAINT "_DiscountToRestaurant_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrderDiscounts" DROP CONSTRAINT "_OrderDiscounts_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrderDiscounts" DROP CONSTRAINT "_OrderDiscounts_B_fkey";

-- DropForeignKey
ALTER TABLE "markups" DROP CONSTRAINT "markups_restaurantId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_markupId_fkey";

-- DropIndex
DROP INDEX "discounts_promoCode_key";

-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "bonus_points" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "discounts" DROP COLUMN "cashbackValue",
DROP COLUMN "createdAt",
DROP COLUMN "endDate",
DROP COLUMN "endTime",
DROP COLUMN "isCashback",
DROP COLUMN "name",
DROP COLUMN "promoCode",
DROP COLUMN "restaurantId",
DROP COLUMN "startDate",
DROP COLUMN "startTime",
DROP COLUMN "updatedAt",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "max_uses" INTEGER,
ADD COLUMN     "min_order_amount" DOUBLE PRECISION,
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "value" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "markupId",
ADD COLUMN     "bonus_points_earned" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bonus_points_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discount_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurant" ADD COLUMN     "network_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "_DiscountCategories";

-- DropTable
DROP TABLE "_DiscountProducts";

-- DropTable
DROP TABLE "_DiscountToRestaurant";

-- DropTable
DROP TABLE "_OrderDiscounts";

-- DropTable
DROP TABLE "markups";

-- CreateTable
CREATE TABLE "order_surcharges" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "surcharge_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_surcharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surcharges" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EnumSurchargeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "orderTypes" "EnumOrderType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "surcharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_surcharge" (
    "surcharge_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,

    CONSTRAINT "restaurant_surcharge_pkey" PRIMARY KEY ("surcharge_id","restaurant_id")
);

-- CreateTable
CREATE TABLE "bonus_transactions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "order_id" TEXT,

    CONSTRAINT "bonus_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_discount" (
    "discount_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,

    CONSTRAINT "restaurant_discount_pkey" PRIMARY KEY ("discount_id","restaurant_id")
);

-- CreateTable
CREATE TABLE "category_discount" (
    "discount_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "category_discount_pkey" PRIMARY KEY ("discount_id","category_id")
);

-- CreateTable
CREATE TABLE "product_discount" (
    "discount_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,

    CONSTRAINT "product_discount_pkey" PRIMARY KEY ("discount_id","product_id")
);

-- CreateTable
CREATE TABLE "discount_applications" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "discount_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'API',
    "domain" TEXT,
    "subdomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logo" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4f46e5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#1e293b',
    "accentColor" TEXT NOT NULL DEFAULT '#f43f5e',
    "settings" JSONB,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "networks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "logo" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4f46e5',

    CONSTRAINT "networks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_customerId_key" ON "PromoCode"("code", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "networks_tenant_id_key" ON "networks"("tenant_id");

-- AddForeignKey
ALTER TABLE "restaurant" ADD CONSTRAINT "restaurant_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_surcharges" ADD CONSTRAINT "order_surcharges_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_surcharges" ADD CONSTRAINT "order_surcharges_surcharge_id_fkey" FOREIGN KEY ("surcharge_id") REFERENCES "surcharges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_surcharge" ADD CONSTRAINT "restaurant_surcharge_surcharge_id_fkey" FOREIGN KEY ("surcharge_id") REFERENCES "surcharges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_surcharge" ADD CONSTRAINT "restaurant_surcharge_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_discount" ADD CONSTRAINT "restaurant_discount_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_discount" ADD CONSTRAINT "restaurant_discount_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_discount" ADD CONSTRAINT "category_discount_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_discount" ADD CONSTRAINT "category_discount_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discount" ADD CONSTRAINT "product_discount_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discount" ADD CONSTRAINT "product_discount_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_applications" ADD CONSTRAINT "discount_applications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networks" ADD CONSTRAINT "networks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "networks" ADD CONSTRAINT "networks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
