"use client";

import { useEffect, useState } from "react";
import {
  UMAMI_PROXY_BASE,
  UMAMI_RECORDER_INTEGRITY,
  UMAMI_RECORDER_SCRIPT_PATH,
  UMAMI_SCRIPT_PATH,
} from "@/lib/umami";
import {
  canLoadUmamiRecorder,
  canLoadUmamiTracker,
  hasCredentialQuery,
  isDoNotTrackEnabled,
  isUmamiExcludedRoute,
  resolveUmamiConsent,
  sanitizeUmamiPayload,
  UMAMI_CONSENT_STORAGE_KEY,
  type UmamiConsent,
} from "@/lib/umami-consent";

declare global {
  interface Window {
    togetherUmamiBeforeSend?: (type: string, payload: unknown) => unknown;
  }
}

function appendScript(
  id: string,
  src: string,
  attributes: Record<string, string> = {},
): Promise<void> {
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    script.referrerPolicy = "no-referrer";
    for (const [name, value] of Object.entries(attributes)) script.setAttribute(name, value);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${id}`));
    document.head.appendChild(script);
  });
}

/** Consent-gated Umami analytics. Replays remain available on product routes after replay consent. */
export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const [doNotTrack, setDoNotTrack] = useState(false);
  const [consent, setConsent] = useState<UmamiConsent>("essential");
  const [consentReady, setConsentReady] = useState(false);
  const [open, setOpen] = useState(false);
  const displayedConsent = consent === "basic" ? "essential" : consent;

  useEffect(() => {
    const dnt = isDoNotTrackEnabled(navigator, window);
    setDoNotTrack(dnt);
    setConsent(resolveUmamiConsent(localStorage.getItem(UMAMI_CONSENT_STORAGE_KEY), dnt));
    setConsentReady(true);
  }, []);

  useEffect(() => {
    if (
      !websiteId ||
      !appUrl ||
      !consentReady ||
      doNotTrack ||
      isUmamiExcludedRoute(window.location.pathname) ||
      hasCredentialQuery(window.location.href) ||
      !canLoadUmamiTracker(consent)
    )
      return;
    let cancelled = false;
    window.togetherUmamiBeforeSend = (_type, payload) =>
      sanitizeUmamiPayload(payload, window.location.origin);
    void appendScript("together-umami-sanitizer", "/umami-recorder-sanitizer.js")
      .then(() =>
        appendScript("umami-analytics", UMAMI_SCRIPT_PATH, {
          "data-website-id": websiteId,
          "data-host-url": `${appUrl}${UMAMI_PROXY_BASE}`,
          "data-do-not-track": "true",
          "data-exclude-search": "false",
          "data-exclude-hash": "true",
          "data-before-send": "togetherUmamiBeforeSend",
        }),
      )
      .then(() =>
        canLoadUmamiRecorder(consent)
          ? appendScript("umami-recorder", UMAMI_RECORDER_SCRIPT_PATH, {
              "data-website-id": websiteId,
              "data-host-url": `${appUrl}${UMAMI_PROXY_BASE}`,
              integrity: UMAMI_RECORDER_INTEGRITY,
              crossorigin: "anonymous",
            })
          : undefined,
      )
      .catch(() => {
        if (!cancelled) console.warn("Umami analytics did not load");
      });
    return () => {
      cancelled = true;
    };
  }, [appUrl, consent, consentReady, doNotTrack, websiteId]);

  const saveConsent = (next: UmamiConsent) => {
    if (doNotTrack) return;
    localStorage.setItem(UMAMI_CONSENT_STORAGE_KEY, next);
    // Existing tracker/recorder instances cannot be safely downgraded in place.
    window.location.reload();
  };

  if (!websiteId || !appUrl) return null;
  return (
    <div className="fixed bottom-3 left-3 z-[250] max-w-sm text-sm">
      <button
        type="button"
        className="rounded-md bg-[var(--surface-raised)] px-3 py-2 text-[var(--text-muted)] shadow-lg ring-1 ring-[var(--border)]"
        aria-expanded={open}
        aria-controls="analytics-choices"
        onClick={() => setOpen((value) => !value)}
      >
        Analytics privacy
      </button>
      {open && (
        <section
          id="analytics-choices"
          aria-label="Analytics privacy choices"
          className="mt-2 rounded-lg bg-[var(--surface-raised)] p-4 shadow-xl ring-1 ring-[var(--border)]"
        >
          <h2 className="font-semibold text-[var(--text)]">Analytics choices</h2>
          {doNotTrack ? (
            <p className="mt-2 text-[var(--text-muted)]">
              Your browser&apos;s Do Not Track setting is on, so Together will not load Umami
              analytics, heatmaps, or session replay.
            </p>
          ) : (
            <fieldset className="mt-3 space-y-3">
              <legend className="sr-only">Choose analytics level</legend>
              {(
                [
                  [
                    "essential",
                    "Essential metrics",
                    "Anonymous visitor, session, page, campaign, and referrer metrics only.",
                  ],
                  [
                    "replay",
                    "Analytics and replays",
                    "Also records session replay and heatmap interaction.",
                  ],
                ] as const
              ).map(([value, label, description]) => (
                <label key={value} className="flex cursor-pointer gap-2 text-[var(--text-muted)]">
                  <input
                    type="radio"
                    name="umami-consent"
                    value={value}
                    defaultChecked={displayedConsent === value}
                    onChange={() => saveConsent(value)}
                  />
                  <span>
                    <strong className="text-[var(--text)]">{label}</strong>
                    <span className="block">{description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            We retain standard UTM campaign parameters but remove other query strings, fragments,
            and room identities before reporting URLs. Changing your selection reloads the app so
            the chosen level applies cleanly.
          </p>
        </section>
      )}
    </div>
  );
}
