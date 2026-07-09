import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Offline",
  alternates: {
    canonical: "/offline",
  },
  robots: { index: false, follow: false },
};

export default function OfflineLayout({ children }: { children: ReactNode }) {
  return children;
}
