import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { getRoomBySlug } from "@/lib/rooms";
import { purgeRoomDurableObject } from "@/lib/admin-data";

export const POST = withApiHandler(
  "POST /api/admin/rooms/[slug]/purge",
  async (log, _request, context) => {
    const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
    if (auth.error) return auth.error;

    const { slug } = await context!.params!;
    const room = await log.span("getRoomBySlug", () => getRoomBySlug(slug));
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const purged = await log.span("purgeRoomDurableObject", () =>
      purgeRoomDurableObject(room.id),
    );

    await log.span("writeAdminAuditLog", () =>
      writeAdminAuditLog({
        actorId: auth.user.id,
        action: "room.purge",
        targetType: "room",
        targetId: slug,
        metadata: { purged },
      }),
    );

    return NextResponse.json({ ok: true, purged });
  },
);
