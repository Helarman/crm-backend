/*
  Warnings:

  - You are about to drop the column `ingredients` on the `product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product" DROP COLUMN "ingredients";

-- CreateTable
CREATE TABLE "product_ingredient" (
    "product_id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "product_ingredient_pkey" PRIMARY KEY ("product_id","inventory_item_id")
);

-- AddForeignKey
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
