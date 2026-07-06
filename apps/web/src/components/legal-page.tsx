import Link from "next/link";
import { Button } from "@together/ui";
import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

const EFFECTIVE_DATE = "July 6, 2026";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text)]"
          >
            <Music2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            Together
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Effective {EFFECTIVE_DATE}
        </p>

        <div className="legal-prose mt-8 space-y-8 text-sm leading-relaxed text-[var(--text)] [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-2 [&_ol]:pl-0 [&_p]:text-[var(--text-muted)] [&_section]:space-y-3 [&_ul]:space-y-2 [&_ul]:pl-0">
          {children}
        </div>

        <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-8 text-sm text-[var(--text-muted)]">
          <Link href="/privacy" className="hover:text-[var(--text)]">
            Privacy Policy
          </Link>
          <Link href="/tos" className="hover:text-[var(--text)]">
            Terms of Service
          </Link>
          <Link href="/" className="hover:text-[var(--text)]">
            Back to home
          </Link>
        </footer>
      </main>
    </div>
  );
}
