-- Migrate opportunities table
UPDATE opportunities SET posted_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', posted_at) WHERE posted_at IS NOT NULL AND posted_at NOT LIKE '%T%';
UPDATE opportunities SET scraped_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', scraped_at) WHERE scraped_at IS NOT NULL AND scraped_at NOT LIKE '%T%';
UPDATE opportunities SET updated_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', updated_at) WHERE updated_at IS NOT NULL AND updated_at NOT LIKE '%T%';
UPDATE opportunities SET last_seen_in_feed_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', last_seen_in_feed_at) WHERE last_seen_in_feed_at IS NOT NULL AND last_seen_in_feed_at NOT LIKE '%T%';
UPDATE opportunities SET last_verified_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', last_verified_at) WHERE last_verified_at IS NOT NULL AND last_verified_at NOT LIKE '%T%';

-- Migrate va_directory table
UPDATE va_directory SET verified_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', verified_at) WHERE verified_at IS NOT NULL AND verified_at NOT LIKE '%T%';
UPDATE va_directory SET created_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', created_at) WHERE created_at IS NOT NULL AND created_at NOT LIKE '%T%';

-- Migrate content_digests table
UPDATE content_digests SET published_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', published_at) WHERE published_at IS NOT NULL AND published_at NOT LIKE '%T%';
UPDATE content_digests SET processed_at = strftime('%Y-%m-%dT%H:%M:%S.000Z', processed_at) WHERE processed_at IS NOT NULL AND processed_at NOT LIKE '%T%';
