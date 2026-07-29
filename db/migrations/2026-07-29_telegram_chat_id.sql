-- 2026-07-29 — Add telegram_chat_id to leads for bot memory across messages
-- Purpose: the Maria Telegram bot needs to remember the same lead across
-- multiple messages. Vercel serverless globals don't persist between
-- invocations, so we use the database as the source of truth.
-- Idempotent: safe to re-run.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Index for fast lookup of the most recent lead per chat
CREATE INDEX IF NOT EXISTS idx_leads_telegram_chat_id
  ON leads (telegram_chat_id, timestamp DESC)
  WHERE telegram_chat_id IS NOT NULL;

-- Comment for the team
COMMENT ON COLUMN leads.telegram_chat_id IS
  'Telegram chat_id of the user (when source=telegram_bot). Used to continue the same lead across bot messages.';
