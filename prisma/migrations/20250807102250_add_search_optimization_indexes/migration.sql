-- Add full-text search indexes using PostgreSQL's built-in capabilities

-- Create GIN indexes for full-text search on program name and description
-- Using English configuration for better text processing
CREATE INDEX IF NOT EXISTS "programs_name_fulltext_idx" 
ON "public"."programs" USING gin(to_tsvector('english', "name"));

CREATE INDEX IF NOT EXISTS "programs_description_fulltext_idx" 
ON "public"."programs" USING gin(to_tsvector('english', "description"));

-- Create a combined full-text search index for name and description together
-- This allows searching across both fields efficiently
CREATE INDEX IF NOT EXISTS "programs_name_description_fulltext_idx" 
ON "public"."programs" USING gin(to_tsvector('english', "name" || ' ' || COALESCE("description", '')));

-- Single column indexes for frequent filtering operations
CREATE INDEX IF NOT EXISTS "programs_status_idx" 
ON "public"."programs" ("status");

CREATE INDEX IF NOT EXISTS "programs_language_idx" 
ON "public"."programs" ("language");

CREATE INDEX IF NOT EXISTS "programs_media_type_idx" 
ON "public"."programs" ("media_type");

CREATE INDEX IF NOT EXISTS "programs_category_id_idx" 
ON "public"."programs" ("category_id");

-- Sorting indexes - critical for performance
CREATE INDEX IF NOT EXISTS "programs_release_date_desc_idx" 
ON "public"."programs" ("release_date" DESC);

CREATE INDEX IF NOT EXISTS "programs_created_at_desc_idx" 
ON "public"."programs" ("created_at" DESC);

-- Composite indexes for common query patterns from Discovery and Programs services

-- Most common: published programs ordered by release date
CREATE INDEX IF NOT EXISTS "programs_status_release_date_idx" 
ON "public"."programs" ("status", "release_date" DESC);

-- Browsing by category and status
CREATE INDEX IF NOT EXISTS "programs_status_category_release_date_idx" 
ON "public"."programs" ("status", "category_id", "release_date" DESC);

-- Filtering by language and status
CREATE INDEX IF NOT EXISTS "programs_status_language_release_date_idx" 
ON "public"."programs" ("status", "language", "release_date" DESC);

-- Filtering by media type and status  
CREATE INDEX IF NOT EXISTS "programs_status_media_type_release_date_idx" 
ON "public"."programs" ("status", "media_type", "release_date" DESC);

-- Complex filtering: status + category + language + media type
CREATE INDEX IF NOT EXISTS "programs_status_category_language_media_idx" 
ON "public"."programs" ("status", "category_id", "language", "media_type", "release_date" DESC);

-- Index for active categories lookup (frequently used)
CREATE INDEX IF NOT EXISTS "categories_is_active_name_idx" 
ON "public"."categories" ("is_active", "name");

-- Source type filtering for import operations
CREATE INDEX IF NOT EXISTS "programs_source_type_idx" 
ON "public"."programs" ("source_type");

-- External ID lookups for import operations
CREATE INDEX IF NOT EXISTS "programs_external_id_idx" 
ON "public"."programs" ("external_id") WHERE "external_id" IS NOT NULL;