ALTER TABLE messages
ADD COLUMN IF NOT EXISTS conversation_id TEXT NOT NULL DEFAULT 'default';

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'assistant';

UPDATE messages
SET conversation_id = 'default'
WHERE conversation_id IS NULL OR btrim(conversation_id) = '';

UPDATE messages
SET role = 'assistant'
WHERE role IS NULL OR btrim(role) = '';

CREATE INDEX IF NOT EXISTS idx_messages_user_conv_time
ON messages(user_id, conversation_id, created_at DESC);
