-- Add auto-publish fields to content_drafts table
-- These fields enable scheduled content publishing

ALTER TABLE content_drafts
ADD COLUMN IF NOT EXISTS scheduled_for_auto_publish BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_publish_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Create an index for efficient auto-publish queries
CREATE INDEX IF NOT EXISTS idx_content_drafts_auto_publish
ON content_drafts (auto_publish_date)
WHERE scheduled_for_auto_publish = TRUE AND state != 'published';

COMMENT ON COLUMN content_drafts.scheduled_for_auto_publish IS 'Whether this content is scheduled for automatic publishing';
COMMENT ON COLUMN content_drafts.auto_publish_date IS 'When to automatically publish this content';
COMMENT ON COLUMN content_drafts.published_at IS 'When this content was actually published';
