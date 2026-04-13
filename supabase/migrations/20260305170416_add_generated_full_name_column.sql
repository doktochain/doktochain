/*
  # Add generated full_name column to user_profiles

  1. Modified Tables
    - `user_profiles`: Add `full_name` as a generated column that concatenates first_name and last_name
    - `user_profiles`: Add `avatar_url` as an alias column that mirrors profile_photo_url

  2. Important Notes
    - `full_name` is a stored generated column - automatically maintained by PostgreSQL
    - `avatar_url` is a simple nullable column that can be used interchangeably with profile_photo_url
    - These additions fix 30+ service file references that expect these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'full_name') THEN
    ALTER TABLE user_profiles ADD COLUMN full_name text GENERATED ALWAYS AS (
      CASE
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL THEN first_name
        WHEN last_name IS NOT NULL THEN last_name
        ELSE ''
      END
    ) STORED;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_avatar_url()
RETURNS TRIGGER AS $func$
BEGIN
  IF NEW.profile_photo_url IS DISTINCT FROM OLD.profile_photo_url THEN
    NEW.avatar_url := NEW.profile_photo_url;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_avatar_url') THEN
    CREATE TRIGGER trg_sync_avatar_url
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_avatar_url();
  END IF;
END $$;

UPDATE user_profiles SET avatar_url = profile_photo_url WHERE profile_photo_url IS NOT NULL AND avatar_url IS NULL;