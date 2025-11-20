ALTER TABLE events
  ADD COLUMN IF NOT EXISTS target_url TEXT;
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS last_error TEXT;

UPDATE events e
SET target_url = s.target_url
FROM subscriptions s
WHERE e.subscription_id = s.id
  AND (e.target_url IS NULL OR e.target_url = '');

ALTER TABLE events
  ALTER COLUMN target_url SET NOT NULL;
