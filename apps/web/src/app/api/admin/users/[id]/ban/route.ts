import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { z } from "zod";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { setUserBanned } from "@/lib/admin-data";

const schema = z.object({ banned: z.boolean() });

export const POST = withApiHandler(
  "POST /api/admin/users/[id]/ban",
  async (log, request, context) => {
    const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
    if (auth.error) return auth.error;

    const { id } = await context!.params!;
    if (auth.user.id === id) {
      return NextResponse.json({ error: "You cannot ban yourself" }, { status: 400 });
    }

    const { banned } = schema.parse(await request.json());
    await log.span("setUserBanned", () => setUserBanned(id, banned));

    await log.span("writeAdminAuditLog", () =>
      writeAdminAuditLog({
        actorId: auth.user.id,
        action: banned ? "user.ban" : "user.unban",
        targetType: "user",
        targetId: id,
      }),
    );

    return NextResponse.json({ ok: true });
  },
);
