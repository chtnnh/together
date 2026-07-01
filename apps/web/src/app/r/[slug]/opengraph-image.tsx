import { getRoomOgTitle, OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";

export const runtime = "nodejs";
export const alt = "Together room";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = await getRoomOgTitle(slug);
  const appHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "together.chtnnhfoundation.org";

  return renderOgImage({
    title,
    subtitle: `Watch and listen together · ${appHost}/r/${slug}`,
  });
}
