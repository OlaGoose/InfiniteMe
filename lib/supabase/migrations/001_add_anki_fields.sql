-- Migration: Add Anki SM-2 algorithm fields to flashcards table
-- Run this migration on your Supabase database

-- Add Anki SM-2 algorithm fields to flashcards table
ALTER TABLE flashcards 
  ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  ADD COLUMN IF NOT EXISTS last_review_date BIGINT,
  ADD COLUMN IF NOT EXISTS quality INTEGER CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_type ON checkpoints(user_id, type);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_event_history_user_timestamp ON event_history(user_id, timestamp DESC);

-- Update existing flashcards with default values
UPDATE flashcards 
SET 
  ease_factor = COALESCE(ease_factor, 2.5),
  interval = COALESCE(interval, 0),
  next_review_date = COALESCE(next_review_date, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
WHERE ease_factor IS NULL OR interval IS NULL OR next_review_date IS NULL;
