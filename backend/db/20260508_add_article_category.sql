ALTER TABLE articles
ADD COLUMN IF NOT EXISTS category VARCHAR(128) NOT NULL DEFAULT 'Uncategorized';

UPDATE articles
SET category = 'Uncategorized'
WHERE category IS NULL OR BTRIM(category) = '';
