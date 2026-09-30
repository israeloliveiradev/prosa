ALTER TABLE news_feed_cache
  ADD COLUMN IF NOT EXISTS native_lang text NOT NULL DEFAULT 'pt';

ALTER TABLE news_feed_cache
  DROP CONSTRAINT IF EXISTS news_feed_cache_native_lang_supported;

ALTER TABLE news_feed_cache
  ADD CONSTRAINT news_feed_cache_native_lang_supported CHECK (
    native_lang IN ('pt', 'en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  );

ALTER TABLE news_feed_cache
  DROP CONSTRAINT IF EXISTS news_feed_cache_url_level_unique;

DROP INDEX IF EXISTS news_feed_cache_url_level_unique;

ALTER TABLE news_feed_cache
  DROP CONSTRAINT IF EXISTS news_feed_cache_url_level_native_unique;

ALTER TABLE news_feed_cache
  ADD CONSTRAINT news_feed_cache_url_level_native_unique
  UNIQUE (target_lang, native_lang, level, original_url);
