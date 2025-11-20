ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE subscriptions
SET metadata = jsonb_build_object(
  'name', metadata->>'name',
  'description', metadata->>'description'
)
WHERE metadata ?| ARRAY['name','description'] IS FALSE;
