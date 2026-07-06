import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://together.chtnnhfoundation.org";
const appHost = appUrl.replace(/^https?:\/\//, "");

export const metadata: Metadata = {
  title: "Privacy Policy — Together",
  description: "How Together collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          Together (&quot;Together,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a
          synced watch-and-listen service available at{" "}
          <a href={appUrl}>{appHost}</a>. This Privacy Policy explains what information we
          collect when you use Together, how we use it, and the choices you have.
        </p>
        <p>
          Together is operated by chtnnh. By using the service, you agree to the practices
          described here. If you do not agree, please do not use Together.
        </p>
      </section>

      <section>
        <h2>Summary</h2>
        <ul>
          <li>
            You can create and join rooms without creating an account. Optional sign-in uses
            email magic links via Supabase.
          </li>
          <li>
            We store room metadata, optional account data, and ephemeral realtime session state
            to run the service.
          </li>
          <li>
            Playback uses YouTube embeds and related APIs. Optional imports may connect to
            Spotify or SoundCloud when you choose to use those features.
          </li>
          <li>
            Some preferences and identifiers are stored locally in your browser unless you sign
            in to sync account preferences.
          </li>
        </ul>
      </section>

      <section>
        <h2>Information we collect</h2>

        <h3>Information you provide</h3>
        <ul>
          <li>
            <strong>Display name</strong> — chosen when you create or join a room. Stored in
            your browser and sent to room participants while you are connected.
          </li>
          <li>
            <strong>Room details</strong> — room title, privacy setting, optional password
            (stored as a hash, not plain text), queue contents, chat messages, reactions, and
            moderation actions you take as a host or co-host.
          </li>
          <li>
            <strong>Chat and activity</strong> — messages, emoji reactions, skip votes, and
            similar in-room activity visible to other participants.
          </li>
          <li>
            <strong>Account email (optional)</strong> — if you sign in with a magic link, we
            receive and store your email address through Supabase to identify your account.
          </li>
          <li>
            <strong>Saved playlists (optional)</strong> — if you are signed in, playlist names
            and track metadata you save are stored in our database.
          </li>
          <li>
            <strong>Third-party import tokens (optional)</strong> — if you connect Spotify to
            import a playlist, a short-lived access token may be stored in an HTTP-only cookie
            for that import session.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Anonymous identifier</strong> — a random ID generated in your browser
            (`localStorage`) to distinguish guests for moderation, bans, and queue limits.
          </li>
          <li>
            <strong>Local preferences</strong> — theme, audio-only mode, stream quality,
            volume, recent rooms, and similar settings stored in your browser unless synced to
            your account when signed in.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, request timestamps, and basic logs
            used for security, abuse prevention, and rate limiting (for example, on room
            password attempts and API routes).
          </li>
          <li>
            <strong>Service analytics</strong> — aggregated, privacy-oriented usage analytics
            via Vercel Analytics on the web app. We do not use third-party advertising
            trackers.
          </li>
          <li>
            <strong>Realtime session data</strong> — while a room is active, playback position,
            queue state, participant list, and a rolling chat buffer are processed and stored
            temporarily in Cloudflare Durable Object storage to keep participants in sync.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use the information above to:</p>
        <ul>
          <li>Provide synchronized playback, queues, chat, and room moderation features</li>
          <li>Create, join, and secure public, unlisted, and private rooms</li>
          <li>Persist optional account features such as saved playlists and synced preferences</li>
          <li>Resolve tracks to YouTube videos and cache resolution results</li>
          <li>Protect the service against abuse, spam, and unauthorized access</li>
          <li>Operate, maintain, and improve Together</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your data for targeted
          advertising.
        </p>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>Together uses cookies and browser storage for essential functionality, including:</p>
        <ul>
          <li>
            <strong>Authentication cookies</strong> — when you sign in via Supabase, session
            cookies maintain your logged-in state.
          </li>
          <li>
            <strong>Room access cookies</strong> — for private rooms, cookies remember that you
            entered the correct password or used a valid invite link for that room.
          </li>
          <li>
            <strong>OAuth cookies</strong> — short-lived cookies during optional Spotify import
            to complete authorization securely.
          </li>
          <li>
            <strong>Local storage</strong> — display name, anonymous ID, UI preferences, and
            recent rooms are stored locally in your browser.
          </li>
          <li>
            <strong>Service worker cache</strong> — if you install or use the PWA, cached app
            shell assets may be stored on your device for offline fallback.
          </li>
        </ul>
        <p>
          You can clear cookies and local storage in your browser settings. Doing so may sign
          you out, reset local preferences, or require you to re-enter room passwords.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          Together relies on third parties to operate. Those services may collect information
          according to their own policies when you interact with them through Together:
        </p>
        <ul>
          <li>
            <strong>YouTube / Google</strong> — embedded players, search, and track resolution.
            See{" "}
            <a href="https://policies.google.com/privacy" rel="noopener noreferrer">
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Spotify</strong> — optional playlist import when you authorize access. See{" "}
            <a href="https://www.spotify.com/legal/privacy-policy/" rel="noopener noreferrer">
              Spotify&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>SoundCloud</strong> — optional playlist import and track metadata. See{" "}
            <a href="https://soundcloud.com/pages/privacy" rel="noopener noreferrer">
              SoundCloud&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Supabase</strong> — optional authentication and Postgres database hosting.
            See{" "}
            <a href="https://supabase.com/privacy" rel="noopener noreferrer">
              Supabase&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Cloudflare</strong> — realtime WebSocket infrastructure and Durable Object
            storage. See{" "}
            <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener noreferrer">
              Cloudflare&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Vercel</strong> — web hosting and analytics. See{" "}
            <a href="https://vercel.com/legal/privacy-policy" rel="noopener noreferrer">
              Vercel&apos;s Privacy Policy
            </a>
            .
          </li>
        </ul>
        <p>
          We are not responsible for the privacy practices of third-party websites or services
          linked from rooms, chat, or queue items.
        </p>
      </section>

      <section>
        <h2>Data retention</h2>
        <ul>
          <li>
            <strong>Room and account records</strong> — kept while the room or account exists
            and as needed to operate the service. Room owners may delete rooms; signed-in users
            may delete saved playlists.
          </li>
          <li>
            <strong>Realtime session data</strong> — chat buffers, live queue state, and
            participant lists in Durable Object storage are temporary and tied to active or
            recently active sessions.
          </li>
          <li>
            <strong>Security logs and rate-limit counters</strong> — retained for a limited
            period appropriate for abuse prevention, then discarded or aggregated.
          </li>
          <li>
            <strong>Local browser data</strong> — remains on your device until you clear it.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Use Together anonymously without signing in.</li>
          <li>Choose what display name you share in a room.</li>
          <li>Clear browser storage or sign out to remove local or account session data.</li>
          <li>
            Request deletion of account-linked data by contacting us (see Contact). We may retain
            certain information where required for security, legal compliance, or legitimate
            operational needs.
          </li>
        </ul>
      </section>

      <section>
        <h2>Children&apos;s privacy</h2>
        <p>
          Together is not directed to children under 13, and we do not knowingly collect personal
          information from children under 13. If you believe a child has provided us personal
          information, please contact us so we can delete it.
        </p>
      </section>

      <section>
        <h2>International users</h2>
        <p>
          Together is operated from the United Arab Emirates and uses infrastructure providers
          that may process data in other countries. By using the service, you understand that
          your information may be transferred to and processed in jurisdictions with different
          data protection laws than your own.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will revise the effective date
          at the top of this page when we do. Continued use of Together after changes become
          effective constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this Privacy Policy or a data request? Open an issue on{" "}
          <a href="https://github.com/chtnnh/together/issues" rel="noopener noreferrer">
            GitHub
          </a>{" "}
          or contact the operator via{" "}
          <a href="https://me.chtnnhfoundation.org" rel="noopener noreferrer">
            me.chtnnhfoundation.org
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
