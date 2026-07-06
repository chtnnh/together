import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { setUserBanned } from "@/lib/admin-data";

const schema = z.object({ banned: z.boolean() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { banned } = schema.parse(await request.json());
  await setUserBanned(id, banned);

  await writeAdminAuditLog({
    actorId: auth.user.id,
    action: banned ? "user.ban" : "user.unban",
    targetType: "user",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
