import { NextResponse } from "next/server";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { getRoomBySlug } from "@/lib/rooms";
import { purgeRoomDurableObject } from "@/lib/admin-data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const purged = await purgeRoomDurableObject(room.id);

  await writeAdminAuditLog({
    actorId: auth.user.id,
    action: "room.purge",
    targetType: "room",
    targetId: slug,
    metadata: { purged },
  });

  return NextResponse.json({ ok: true, purged });
}
