import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type OgImageOptions = {
  title: string;
  subtitle: string;
  eyebrow?: string;
};

/** Shared Open Graph card — keep JSX Satori-safe (one text child per leaf div). */
export function renderOgImage({ title, subtitle, eyebrow = "Together" }: OgImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #0f0f14 0%, #1a1a24 50%, #312e81 100%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa", marginBottom: 16 }}>
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#c4b5fd", marginTop: 24, maxWidth: 1000 }}>
          {subtitle}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

export async function getRoomOgTitle(slug: string): Promise<string> {
  try {
    if (!process.env.DATABASE_URL) return slug;
    const { getRoomBySlug } = await import("@/lib/rooms");
    const room = await getRoomBySlug(slug);
    const title = room && "title" in room ? room.title : null;
    return title?.trim() || slug;
  } catch {
    return slug;
  }
}
