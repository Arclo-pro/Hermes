CREATE TABLE IF NOT EXISTS "achievement_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"track_id" integer NOT NULL,
	"category_id" text NOT NULL,
	"track_key" text NOT NULL,
	"level" integer NOT NULL,
	"tier" text NOT NULL,
	"previous_tier" text,
	"headline" text NOT NULL,
	"notified_at" timestamp,
	"achieved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text DEFAULT 'empathy-health-clinic' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"author" text DEFAULT 'Empathy Health Clinic' NOT NULL,
	"published_date" text NOT NULL,
	"category" text DEFAULT 'Mental Health' NOT NULL,
	"featured_image" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"scheduled_publish_at" text,
	"published_at" text,
	"meta_title" text,
	"meta_description" text,
	"keywords" text[],
	"og_image" text,
	"canonical_slug" text,
	"last_updated" text,
	"average_rating" real,
	"rating_count" integer,
	"best_rating" integer,
	"worst_rating" integer,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_coverage_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"total_inspected" integer NOT NULL,
	"total_indexed" integer NOT NULL,
	"total_not_indexed" integer NOT NULL,
	"total_errors" integer NOT NULL,
	"robots_blocked" integer DEFAULT 0,
	"noindex_detected" integer DEFAULT 0,
	"crawl_errors" integer DEFAULT 0,
	"redirect_errors" integer DEFAULT 0,
	"server_errors" integer DEFAULT 0,
	"not_found_errors" integer DEFAULT 0,
	"coverage_percent" real NOT NULL,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gsc_url_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"page_url" text NOT NULL,
	"coverage_state" text NOT NULL,
	"verdict" text,
	"robots_txt_state" text,
	"indexing_state" text,
	"page_fetch_state" text,
	"is_indexed" boolean DEFAULT false NOT NULL,
	"has_error" boolean DEFAULT false NOT NULL,
	"error_category" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manual_action_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"check_type" text NOT NULL,
	"status" text NOT NULL,
	"user_notes" text,
	"last_user_confirmed_at" timestamp,
	"gsc_web_ui_link" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "robots_txt_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"date" text NOT NULL,
	"exists" boolean NOT NULL,
	"http_status" integer,
	"content_hash" text,
	"content" text,
	"disallowed_paths" jsonb,
	"sitemap_urls" jsonb,
	"is_valid" boolean DEFAULT true NOT NULL,
	"validation_errors" jsonb,
	"sitemaps_missing" jsonb,
	"sitemaps_extra" jsonb,
	"blocks_important_paths" boolean DEFAULT false,
	"blocked_important_paths" jsonb,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "used_blog_images" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text DEFAULT 'empathy-health-clinic' NOT NULL,
	"image_url" text NOT NULL,
	"description" text NOT NULL,
	"alt_text" text NOT NULL,
	"source" text DEFAULT 'unsplash' NOT NULL,
	"used_in_blog_post_id" varchar,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "used_blog_images_image_url_unique" UNIQUE("image_url")
);
--> statement-breakpoint
ALTER TABLE "digest_schedule" ADD COLUMN IF NOT EXISTS "alert_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "user_id" integer;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN IF NOT EXISTS "business_details" jsonb;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
