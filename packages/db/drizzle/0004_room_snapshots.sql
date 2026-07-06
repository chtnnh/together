ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "live_snapshot" jsonb;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "last_active_at" timestamp with time zone;
