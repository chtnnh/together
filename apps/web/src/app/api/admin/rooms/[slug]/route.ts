import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { deleteRoomBySlug } from "@/lib/admin-data";

export const DELETE = withApiHandler(
  "DELETE /api/admin/rooms/[slug]",
  async (log, _request, context) => {
    const auth = await log.span("requireSuperadmin", () => requireSuperadmin());
    if (auth.error) return auth.error;

    const { slug } = await context!.params!;
    const deleted = await log.span("deleteRoomBySlug", () => deleteRoomBySlug(slug));
    if (!deleted) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    await log.span("writeAdminAuditLog", () =>
      writeAdminAuditLog({
        actorId: auth.user.id,
        action: "room.delete",
        targetType: "room",
        targetId: slug,
      }),
    );

    return NextResponse.json({ ok: true });
  },
);
