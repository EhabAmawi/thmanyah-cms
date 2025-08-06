-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('MANUAL', 'YOUTUBE', 'VIMEO', 'RSS', 'API');

-- AlterTable
ALTER TABLE "public"."programs" ADD COLUMN     "source_type" "public"."SourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "external_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "programs_external_id_source_type_key" ON "public"."programs"("external_id", "source_type");