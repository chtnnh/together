import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Saved Playlists",
  alternates: {
    canonical: "/playlists",
  },
  robots: { index: false, follow: false },
};

export default function PlaylistsLayout({ children }: { children: ReactNode }) {
  return children;
}
