DO $$ BEGIN
  CREATE TYPE "app_role" AS ENUM('user', 'superadmin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "app_role" "app_role" DEFAULT 'user' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "banned_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid REFERENCES "users"("id"),
  "action" varchar(64) NOT NULL,
  "target_type" varchar(32) NOT NULL,
  "target_id" varchar(128),
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
