import "@together/ui/globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "Together — Watch & Listen Together",
  description:
    "Create a room, sync YouTube playback with friends, build a collaborative queue, vote to skip, and chat — no account required.",
  manifest: "/manifest.json",
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
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
