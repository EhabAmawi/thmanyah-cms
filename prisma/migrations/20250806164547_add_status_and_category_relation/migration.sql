/*
  Warnings:

  - Added the required column `category_id` to the `programs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'DRAFT';

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
