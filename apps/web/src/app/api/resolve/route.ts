import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { resolveTrackWithCache } from "@/lib/youtube";
import { trackMetadataSchema } from "@together/shared";

export const POST = withApiHandler("POST /api/resolve", async (_log, request) => {
  const metadata = trackMetadataSchema.parse(await request.json());
  const result = await resolveTrackWithCache(metadata);
  return NextResponse.json(result);
});
