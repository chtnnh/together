import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Account suspended",
  alternates: {
    canonical: "/banned",
  },
  robots: { index: false, follow: false },
};

export default function BannedLayout({ children }: { children: ReactNode }) {
  return children;
}
