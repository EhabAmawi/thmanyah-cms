-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('ENGLISH', 'ARABIC');

-- CreateTable
CREATE TABLE "public"."programs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "language" "public"."Language" NOT NULL DEFAULT 'ENGLISH',
    "duration_sec" INTEGER NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" "public"."MediaType" NOT NULL DEFAULT 'VIDEO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programs_name_key" ON "public"."programs"("name");
