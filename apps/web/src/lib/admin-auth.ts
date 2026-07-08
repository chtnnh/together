import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isSupabaseEnvConfigured } from "@/lib/supabase/env";
import { getDb, users } from "@together/db";
import { eq } from "drizzle-orm";

function getSuperadminEmails(): Set<string> {
  const raw = process.env.SUPERADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAuthedUser() {
  if (!isSupabaseEnvConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isSuperadminUser(userId: string, email?: string | null): Promise<boolean> {
  const allowlist = getSuperadminEmails();
  if (email && allowlist.has(email.toLowerCase())) return true;

  if (process.env.DATABASE_URL?.trim()) {
    const db = getDb();
    const [row] = await db
      .select({ appRole: users.appRole, bannedAt: users.bannedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (row?.bannedAt) return false;
    return row?.appRole === "superadmin";
  }

  return false;
}

export async function requireSuperadmin() {
  const user = await getAuthedUser();
  if (!user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const allowed = await isSuperadminUser(user.id, user.email);
  if (!allowed) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function writeAdminAuditLog(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!process.env.DATABASE_URL) return;
  const { adminAuditLog } = await import("@together/db");
  const db = getDb();
  await db.insert(adminAuditLog).values({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
  });
}
