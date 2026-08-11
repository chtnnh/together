import Script from "next/script";
import { UMAMI_PROXY_BASE, UMAMI_RECORDER_SCRIPT_PATH, UMAMI_SCRIPT_PATH } from "@/lib/umami";

/** Umami analytics + session replay/heatmaps via first-party proxy (see next.config.ts rewrites). */
export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!websiteId || !appUrl) return null;

  const hostUrl = `${appUrl}${UMAMI_PROXY_BASE}`;

  return (
    <>
      <Script
        id="umami-analytics"
        src={UMAMI_SCRIPT_PATH}
        strategy="afterInteractive"
        defer
        data-website-id={websiteId}
        data-host-url={hostUrl}
        data-do-not-track="true"
      />
      <Script
        id="umami-recorder"
        src={UMAMI_RECORDER_SCRIPT_PATH}
        strategy="afterInteractive"
        defer
        data-website-id={websiteId}
        data-host-url={hostUrl}
      />
    </>
  );
}
