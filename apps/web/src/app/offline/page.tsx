import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-[var(--text-muted)]">
        Open a room when you&apos;re back online. Cached pages may still load from your device.
      </p>
      <Link href="/" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
        Back to home
      </Link>
    </div>
  );
}
