import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = ["/", "/privacy", "/tos"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));

  let publicRooms: MetadataRoute.Sitemap = [];

  try {
    const { listPublicRooms, isMemoryStoreEnabled } = await import("@/lib/rooms");
    if (!isMemoryStoreEnabled()) {
      const rooms = await listPublicRooms(500);
      publicRooms = rooms.map((room) => ({
        url: absoluteUrl(`/r/${room.slug}`),
        lastModified: room.createdAt,
        changeFrequency: "daily",
        priority: 0.7,
      }));
    }
  } catch {
    publicRooms = [];
  }

  return [...staticRoutes, ...publicRooms];
}
