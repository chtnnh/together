import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Import Spotify playlist",
  alternates: {
    canonical: "/import/spotify",
  },
  robots: { index: false, follow: false },
};

export default function SpotifyImportLayout({ children }: { children: ReactNode }) {
  return children;
}
