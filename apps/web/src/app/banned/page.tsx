import Link from "next/link";

export default function BannedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Account suspended</h1>
      <p className="max-w-md text-sm text-[var(--text-muted)]">
        Your account has been banned from Together. If you believe this is a mistake, contact
        support.
      </p>
      <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
        Back to home
      </Link>
    </div>
  );
}
