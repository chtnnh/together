import Script from "next/script";

/** Cloudflare Web Analytics beacon — no cookies, privacy-oriented page views. */
export function CloudflareWebAnalytics() {
  const token = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN?.trim();
  if (!token) return null;

  return (
    <Script
      id="cf-web-analytics"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      defer
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
