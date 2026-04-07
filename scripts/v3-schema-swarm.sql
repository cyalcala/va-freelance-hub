/**
 * V12 SIFTER: Air Traffic Control (Hunter Queue)
 * 
 * Instructions:
 * 1. Open your Supabase SQL Editor.
 * 2. Paste and Run this SQL.
 * 
 * This creates the coordination table for your 700/day swarm.
 */

-- 1. THE HUNTER QUEUE (AIR TRAFFIC CONTROL)
CREATE TABLE IF NOT EXISTS hunter_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  host TEXT NOT NULL, -- e.g. 'weworkremotely.com'
  platform TEXT NOT NULL, -- e.g. 'WWR'
  status TEXT DEFAULT 'READY' CHECK (status IN ('READY', 'HUNTING', 'CAPTURED', 'EXHAUSTED', 'FAILED')),
  priority INTEGER DEFAULT 0,
  locked_by UUID, -- Worker ID
  leased_at TIMESTAMP WITH TIME ZONE, -- Lock timeout
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. INDEXES FOR SPEED (700+ SCALE)
CREATE INDEX IF NOT EXISTS idx_hunter_ready ON hunter_queue(status) WHERE status = 'READY';
CREATE INDEX IF NOT EXISTS idx_hunter_host ON hunter_queue(host);

-- 3. INITIALIZE COOLDOWNS (THE BRIGADE STATUS)
CREATE TABLE IF NOT EXISTS ai_cooldowns (
  provider_name TEXT PRIMARY KEY,
  is_blocked BOOLEAN DEFAULT false,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SEED COOLDOWNS
INSERT INTO ai_cooldowns (provider_name) 
VALUES ('OpenRouter'), ('Groq'), ('Gemini'), ('Cerebras')
ON CONFLICT (provider_name) DO NOTHING;

-- 4. VIEW: CURRENT TRAFFIC
CREATE OR REPLACE VIEW swarm_status AS
SELECT 
  status, 
  count(*), 
  min(created_at) as oldest_lead, 
  max(created_at) as newest_lead 
FROM hunter_queue 
GROUP BY status;
