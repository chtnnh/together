import { notFound, redirect } from "next/navigation";
import { getRoomBySlug } from "@/lib/rooms";
import { hasPasswordCookie } from "@/lib/room-access";
import { RoomClient } from "@/components/room-client";

interface RoomPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { slug } = await params;
  const { token: _legacyToken } = await searchParams;

  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  // Unlisted rooms are accessed by slug alone — legacy ?token= links redirect to clean URL
  if (_legacyToken) {
    redirect(`/r/${slug}`);
  }

  const needsPassword = room.privacy === "private" && !!room.passwordHash;

  if (needsPassword && !(await hasPasswordCookie(slug))) {
    redirect(`/r/${slug}/join`);
  }

  await initRealtimeRoom(
    room.id,
    slug,
    room.settings,
    needsPassword,
    ("title" in room ? room.title : null) ?? "",
  );

  return (
    <RoomClient
      roomId={room.id}
      slug={slug}
      initialTitle={("title" in room ? room.title : null) ?? ""}
      hasOwner={!!room.ownerUserId}
      privacy={room.privacy}
    />
  );
}

async function initRealtimeRoom(
  roomId: string,
  slug: string,
  settings: unknown,
  passwordRequired: boolean,
  title: string,
) {
  const base = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/^ws/, "http") ?? "http://localhost:8787";

  try {
    await fetch(`${base}/room/${roomId}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, slug, settings, passwordRequired, title }),
    });
  } catch {
    // Realtime worker may not be running in dev
  }
}
