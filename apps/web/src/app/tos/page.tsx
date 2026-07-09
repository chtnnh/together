import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { absoluteUrl } from "@/lib/seo";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://together.chtnnhfoundation.org";
const appHost = appUrl.replace(/^https?:\/\//, "");

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Together.",
  alternates: {
    canonical: "/tos",
  },
  openGraph: {
    title: "Terms of Service | Together",
    description: "Terms and conditions for using Together.",
    url: absoluteUrl("/tos"),
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Together",
    description: "Terms and conditions for using Together.",
  },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of Together
          (&quot;Together,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), the synced
          watch-and-listen service at <a href={appUrl}>{appHost}</a>. Together is operated by
          chtnnh.
        </p>
        <p>
          By accessing or using Together, you agree to these Terms and our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2>1. The service</h2>
        <p>
          Together lets users create and join rooms to synchronize YouTube playback, manage
          collaborative queues, chat, vote to skip, and use related moderation and
          personalization features. Some features require an optional account; core room
          functionality does not.
        </p>
        <p>
          We may modify, suspend, or discontinue any part of the service at any time, with or
          without notice. Together is provided on an &quot;as is&quot; and &quot;as available&quot;
          basis.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use Together. If you are under the age of majority
          in your jurisdiction, you may use the service only with permission from a parent or
          legal guardian who accepts these Terms on your behalf.
        </p>
        <p>
          You are responsible for ensuring that your use of Together complies with applicable
          laws, including copyright and platform terms for content you play or share.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          Creating an account is optional. If you sign in with an email magic link, you are
          responsible for maintaining access to that email address and for activity under your
          account.
        </p>
        <p>
          You must provide accurate information and notify us if you suspect unauthorized access
          to your account. We may suspend or terminate accounts that violate these Terms.
        </p>
      </section>

      <section>
        <h2>4. Rooms, hosts, and moderation</h2>
        <ul>
          <li>
            Room creators and hosts control room settings, including privacy, passwords, playback
            controls, queue rules, and moderation actions such as kick, ban, and co-host
            promotion.
          </li>
          <li>
            Hosts are responsible for how their rooms are used and for complying with applicable
            law and third-party terms, including YouTube&apos;s Terms of Service.
          </li>
          <li>
            We do not guarantee continuous availability of any room. Rooms may become unavailable
            if inactive, deleted, or affected by infrastructure limits.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use Together for unlawful, harmful, harassing, hateful, or abusive activity</li>
          <li>Infringe intellectual property or privacy rights of others</li>
          <li>Attempt to bypass room access controls, bans, or security measures</li>
          <li>Disrupt the service, overload systems, scrape excessively, or probe for vulnerabilities</li>
          <li>Impersonate others or misrepresent your affiliation</li>
          <li>Upload malware, spam automated requests, or interfere with other users&apos; experience</li>
          <li>Use the service to stream or distribute content you do not have rights to share</li>
        </ul>
        <p>
          We may investigate violations and remove content, restrict access to rooms, or terminate
          access to the service at our discretion, with or without notice.
        </p>
      </section>

      <section>
        <h2>6. User content</h2>
        <p>
          You retain ownership of content you submit, such as chat messages, display names, room
          titles, and saved playlists. You grant us a non-exclusive, worldwide, royalty-free
          license to host, store, reproduce, and display that content solely as needed to operate
          and provide Together.
        </p>
        <p>
          You represent that you have the rights necessary to submit your content and that doing
          so does not violate these Terms or any third-party rights.
        </p>
      </section>

      <section>
        <h2>7. Third-party content and services</h2>
        <p>
          Together embeds and interacts with third-party platforms, primarily YouTube, and may
          optionally connect to Spotify, SoundCloud, or other services you choose to use. Your use
          of those platforms through Together is also subject to their terms and policies,
          including:
        </p>
        <ul>
          <li>
            <a href="https://www.youtube.com/t/terms" rel="noopener noreferrer">
              YouTube Terms of Service
            </a>
          </li>
          <li>
            <a href="https://www.spotify.com/legal/end-user-agreement/" rel="noopener noreferrer">
              Spotify Terms of Use
            </a>
          </li>
          <li>
            <a href="https://soundcloud.com/terms-of-use" rel="noopener noreferrer">
              SoundCloud Terms of Use
            </a>
          </li>
        </ul>
        <p>
          We do not own third-party videos, music, or other media played in rooms. Rights holders
          and platform operators control availability, takedowns, and geographic restrictions. We
          are not responsible for third-party content, outages, policy changes, or removal of
          media.
        </p>
      </section>

      <section>
        <h2>8. Intellectual property</h2>
        <p>
          The Together name, branding, website, and original software are owned by the operator
          or licensors and protected by applicable intellectual property laws. The project source
          code is available under the Apache License 2.0 where published, which governs use of
          the code separately from these Terms for use of the hosted service.
        </p>
        <p>
          You may not copy, modify, distribute, or reverse engineer the hosted service except as
          permitted by law or applicable open-source licenses for the source code itself.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, TOGETHER IS PROVIDED WITHOUT WARRANTIES OF ANY
          KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the service will be uninterrupted, error-free, secure, or free
          of harmful components, or that playback will remain synchronized in all network
          conditions or on all devices.
        </p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, CHTNNH AND TOGETHER WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
          PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF OR
          INABILITY TO USE THE SERVICE.
        </p>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO
          THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE
          IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) USD $100. TOGETHER IS CURRENTLY OFFERED
          FREE OF CHARGE, SO THIS LIMIT WILL TYPICALLY BE USD $100.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations of liability, so some of the above
          may not apply to you.
        </p>
      </section>

      <section>
        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless chtnnh and Together from claims, damages,
          losses, and expenses (including reasonable legal fees) arising from your use of the
          service, your content, your rooms, or your violation of these Terms or third-party
          rights.
        </p>
      </section>

      <section>
        <h2>12. Termination</h2>
        <p>
          You may stop using Together at any time. We may suspend or terminate your access if you
          violate these Terms, create risk for other users or the service, or where required by
          law.
        </p>
        <p>
          Sections that by their nature should survive termination — including disclaimers,
          limitations of liability, indemnification, and governing law — will survive.
        </p>
      </section>

      <section>
        <h2>13. Governing law</h2>
        <p>
          These Terms are governed by the laws of the United Arab Emirates, without regard to
          conflict-of-law principles. Any dispute arising from these Terms or the service will be
          brought in the courts of the United Arab Emirates, unless applicable law requires
          otherwise.
        </p>
      </section>

      <section>
        <h2>14. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When we do, we will revise the effective
          date at the top of this page. Material changes may also be highlighted on the site.
          Continued use after changes take effect constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about these Terms? Open an issue on{" "}
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
