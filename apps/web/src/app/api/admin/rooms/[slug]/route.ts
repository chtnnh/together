import { NextResponse } from "next/server";
import { requireSuperadmin, writeAdminAuditLog } from "@/lib/admin-auth";
import { deleteRoomBySlug } from "@/lib/admin-data";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSuperadmin();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const deleted = await deleteRoomBySlug(slug);
  if (!deleted) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await writeAdminAuditLog({
    actorId: auth.user.id,
    action: "room.delete",
    targetType: "room",
    targetId: slug,
  });

  return NextResponse.json({ ok: true });
}
