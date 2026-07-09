import type { Metadata } from "next";
import { Suspense } from "react";
import HomePageClient from "./home-client";
import { absoluteUrl, githubUrl, personalSiteUrl, siteUrl } from "@/lib/seo";

const title = "Together — Watch & Listen Together";
const description =
  "Create a room, sync YouTube playback with friends, build a collaborative queue, vote to skip, and chat — no account required.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/"),
    type: "website",
    siteName: "Together",
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Together" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "Together" }],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Together",
    url: siteUrl,
    sameAs: [githubUrl, personalSiteUrl],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Together",
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Music and video streaming",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "A music and streaming web app for synchronized YouTube playback, collaborative queues, chat, reactions, and private listening rooms.",
    keywords: ["music", "streaming", "watch party", "listening party", "YouTube", "shared queue"],
    featureList: [
      "Synchronized YouTube playback",
      "Collaborative music queue",
      "Private listening rooms",
      "Emoji chat and reactions",
      "Vote-to-skip controls",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
        <HomePageClient />
      </Suspense>
    </>
  );
}
