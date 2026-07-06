import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRoomBySlug } from "@/lib/rooms";
import { hasPasswordCookie, verifyRoomAccess } from "@/lib/room-access";
import { RoomClient } from "@/components/room-client";

interface RoomPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) {
    return { title: "Room not found · Together" };
  }

  const title = ("title" in room ? room.title : null) || slug;
  const description = `Listen together in ${title}. Synced YouTube playback, queue, and chat.`;

  return {
    title: `${title} · Together`,
    description,
    openGraph: {
      title: `${title} · Together`,
      description,
      type: "website",
      siteName: "Together",
      images: [{ url: `/r/${slug}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Together`,
      description,
      images: [{ url: `/r/${slug}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { slug } = await params;

  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const needsPassword = room.privacy === "private" && !!room.passwordHash;
  const hasAccess = needsPassword
    ? (await hasPasswordCookie(slug)) || (await verifyRoomAccess(slug))
    : true;

  if (needsPassword && !hasAccess) {
    redirect(`/r/${slug}/join`);
  }

  await initRealtimeRoom(
    room.id,
    slug,
    room.settings,
    needsPassword,
    ("title" in room ? room.title : null) ?? "",
    "liveSnapshot" in room ? room.liveSnapshot : null,
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
  snapshot: import("@together/shared").RoomLiveSnapshot | null | undefined,
) {
  const base = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/^ws/, "http") ?? "http://localhost:8787";

  try {
    await fetch(`${base}/room/${roomId}/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        slug,
        settings,
        passwordRequired,
        title,
        snapshot: snapshot ?? undefined,
      }),
    });
  } catch {
    // Realtime worker may not be running in dev
  }
}
