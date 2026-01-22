-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Stats Table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  total_steps INTEGER DEFAULT 5000,
  available_steps INTEGER DEFAULT 5000,
  traveled_distance REAL DEFAULT 0,
  completed_dialogues INTEGER DEFAULT 0,
  learned_words INTEGER DEFAULT 0,
  current_location JSONB NOT NULL DEFAULT '{"lat": 51.5080, "lng": -0.1281}',
  avatar_image TEXT,
  inventory TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checkpoints Table
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('chat', 'challenge', 'shop')),
  location JSONB NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic', 'beginner', 'intermediate', 'advanced')),
  scenario TEXT NOT NULL,
  npc_role TEXT NOT NULL,
  dialog_prompt TEXT NOT NULL,
  image TEXT NOT NULL,
  custom_marker_image TEXT,
  is_unlocked BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  challenge_config JSONB,
  shop_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards Table (with Anki SM-2 algorithm fields)
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vocabulary', 'grammar')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  context TEXT,
  review_count INTEGER DEFAULT 0,
  -- Anki SM-2 Algorithm fields
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 0,
  next_review_date BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  last_review_date BIGINT,
  quality INTEGER CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event History Table
CREATE TABLE IF NOT EXISTS event_history (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  checkpoint_name TEXT NOT NULL,
  checkpoint_image TEXT NOT NULL,
  npc_role TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chat', 'challenge', 'shop')),
  messages JSONB NOT NULL,
  challenge_result JSONB,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_user_type ON checkpoints(user_id, type);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_event_history_user_id ON event_history(user_id);
CREATE INDEX IF NOT EXISTS idx_event_history_timestamp ON event_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_history_user_timestamp ON event_history(user_id, timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkpoints_updated_at BEFORE UPDATE ON checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
