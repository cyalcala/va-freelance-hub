-- V12 SIFTER V2: Shared AI Cooldown Table
-- Run this in your Supabase SQL Editor.

-- 1. Create the Table
CREATE TABLE IF NOT EXISTS public.ai_cooldowns (
    provider_name TEXT PRIMARY KEY, -- e.g. 'Cerebras', 'Groq', 'OpenRouter', 'Gemini'
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    retry_at TIMESTAMPTZ, -- When the free-credit quota is expected to reset
    error_count INT DEFAULT 0,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed the Table
INSERT INTO public.ai_cooldowns (provider_name)
VALUES ('Cerebras'), ('Groq'), ('OpenRouter'), ('Gemini')
ON CONFLICT DO NOTHING;

-- 3. Automatic Updated_at Trigger
DROP TRIGGER IF EXISTS update_ai_cooldowns_updated_at ON public.ai_cooldowns;
CREATE TRIGGER update_ai_cooldowns_updated_at
    BEFORE UPDATE ON public.ai_cooldowns
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
