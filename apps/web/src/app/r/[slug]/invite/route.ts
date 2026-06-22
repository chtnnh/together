import { NextResponse } from "next/server";
import { getRoomBySlug } from "@/lib/rooms";

/** Legacy invite URLs — unlisted rooms just need the slug */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);

  const room = await getRoomBySlug(slug);
  if (!room) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  return NextResponse.redirect(new URL(`/r/${slug}`, url.origin));
}
