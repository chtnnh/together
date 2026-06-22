import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { JoinGateClient } from "@/components/join-gate";
import { getRoomBySlug } from "@/lib/rooms";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  if (room.privacy !== "private") {
    redirect(`/r/${slug}`);
  }

  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <JoinGateClient slug={slug} />
    </Suspense>
  );
}
