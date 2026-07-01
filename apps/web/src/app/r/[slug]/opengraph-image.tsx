import { ImageResponse } from "next/og";
import { getRoomBySlug } from "@/lib/rooms";

export const runtime = "edge";
export const alt = "Together room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  const title = (room && "title" in room ? room.title : null) || slug || "Together room";

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
        <div style={{ fontSize: 28, color: "#a1a1aa", marginBottom: 16 }}>Together</div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>{title}</div>
        <div style={{ fontSize: 28, color: "#c4b5fd", marginTop: 24 }}>
          Watch & listen together · together.chtnnhfoundation.org/r/{slug}
        </div>
      </div>
    ),
    { ...size },
  );
}
