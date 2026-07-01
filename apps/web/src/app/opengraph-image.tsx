import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const runtime = "nodejs";
export const alt = "Together — Watch and listen together";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const appHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "together.chtnnhfoundation.org";

  return renderOgImage({
    title: "Watch and listen together",
    subtitle: `Synced YouTube rooms, queue, and chat · ${appHost}`,
  });
}
