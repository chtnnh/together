import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinGateClient } from "@/components/join-gate";
import { getRoomBySlug } from "@/lib/rooms";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Join private room",
    alternates: {
      canonical: `/r/${slug}/join`,
    },
    robots: { index: false, follow: false },
  };
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
