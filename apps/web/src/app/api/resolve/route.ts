import { NextResponse } from "next/server";
import { resolveTrackWithCache } from "@/lib/youtube";
import { trackMetadataSchema } from "@together/shared";

export async function POST(request: Request) {
  const metadata = trackMetadataSchema.parse(await request.json());
  const result = await resolveTrackWithCache(metadata);
  return NextResponse.json(result);
}
