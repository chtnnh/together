import "@together/ui/globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AuthConfigProvider } from "@/components/auth-config-provider";
import { ToastProvider } from "@/components/toast";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";
import { absoluteUrl, siteUrl } from "@/lib/seo";

const title = "Together — Watch & Listen Together";
const description =
  "Create a room, sync YouTube playback with friends, build a collaborative queue, vote to skip, and chat — no account required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | Together",
  },
  description,
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Together",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authConfig = getSupabasePublicConfig();

  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <AuthConfigProvider config={authConfig}>
          <ThemeBootstrap />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          <ToastProvider>
            <ServiceWorkerRegister />
            <div id="main-content">{children}</div>
          </ToastProvider>
          <Analytics />
        </AuthConfigProvider>
      </body>
    </html>
  );
}
