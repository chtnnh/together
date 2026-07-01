"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@together/ui";
import Link from "next/link";
import { getRecentRooms, type RecentRoom } from "@/lib/recent-rooms";
import {
  ArrowRight,
  Clock,
  Headphones,
  History,
  ListMusic,
  Lock,
  MessageSquare,
  MonitorSmartphone,
  Music2,
  Palette,
  Repeat,
  Shield,
  SkipForward,
  Sparkles,
  ThumbsUp,
  Users,
  Vote,
  Youtube,
  Zap,
} from "lucide-react";
import { setDisplayName } from "@/lib/utils";

const FEATURES = [
  {
    icon: Youtube,
    title: "Synced YouTube playback",
    description:
      "Everyone watches the same moment. Drift correction keeps audio and video aligned — late joiners can tap to sync.",
  },
  {
    icon: ListMusic,
    title: "Two-lane queue",
    description:
      "Members request tracks; hosts promote to the DJ queue. Import from YouTube URLs or search.",
  },
  {
    icon: Vote,
    title: "Vote to skip",
    description:
      "Democratic skip votes with a configurable threshold. Hosts can skip instantly when controls are locked.",
  },
  {
    icon: Repeat,
    title: "Loop modes",
    description:
      "Repeat the current track or loop the whole queue. When controls are unlocked, anyone can change loop settings.",
  },
  {
    icon: History,
    title: "Queue history",
    description:
      "Played and skipped tracks move to a shared history pane so you never lose track of what already aired.",
  },
  {
    icon: MessageSquare,
    title: "Emoji chat",
    description:
      "Text chat with a full emoji picker, slow mode, and optional profanity filter. Unread badge when you're on other tabs.",
  },
  {
    icon: Users,
    title: "Host tools",
    description:
      "Kick, ban, promote co-hosts, rename the room, and lock playback so only hosts control play and skip.",
  },
  {
    icon: Lock,
    title: "Private rooms",
    description:
      "Public, unlisted, or password-protected rooms. Share a short link — no account required to join.",
  },
  {
    icon: Palette,
    title: "Your view",
    description:
      "Personal theme, audio-only mode, and stream quality — saved locally per browser without affecting others.",
  },
  {
    icon: MonitorSmartphone,
    title: "Mobile-ready",
    description:
      "Video on top, queue and chat below. Install as a PWA for a full-screen listening session on your phone.",
  },
  {
    icon: Sparkles,
    title: "Smart matching",
    description:
      "Tracks resolve to YouTube via ISRC lookup and fuzzy title matching, with alternate picks.",
  },
  {
    icon: ThumbsUp,
    title: "Open controls mode",
    description:
      "Unlock playback and every member gets play, pause, skip, and direct queue adds — perfect for small groups.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Create or join",
    description: "Pick a display name, create a room in one click, or join with a short room code.",
  },
  {
    step: "2",
    title: "Build the queue",
    description: "Paste a YouTube link, search, or import a playlist. Requests flow into the DJ queue.",
  },
  {
    step: "3",
    title: "Listen together",
    description: "Playback stays in sync. Chat, vote to skip, and tweak your own theme while you hang out.",
  },
] as const;

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Youtube;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--bg-secondary)]">
      <div className="mb-3 inline-flex rounded-lg bg-[var(--accent)]/10 p-2.5 text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-1.5 font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayNameState] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [privacy, setPrivacy] = useState<"public" | "unlisted" | "private">("unlisted");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<
    Array<{ slug: string; title: string; participantCount: number }>
  >([]);

  const kicked = searchParams.get("kicked");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#get-started") {
      document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" });
    }
    setRecentRooms(getRecentRooms());
  }, []);

  useEffect(() => {
    fetch("/api/rooms/public")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPublicRooms(data);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setCreating(true);
    setCreateError(null);
    setDisplayName(displayName.trim());

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          title: roomTitle.trim() || undefined,
          privacy,
          password: privacy === "private" ? roomPassword : undefined,
        }),
      });

      const room = await res.json();

      if (!res.ok) {
        setCreateError(room.error ?? "Failed to create room");
        return;
      }

      if (!room.slug) {
        setCreateError("Server returned an invalid room. Check database connection.");
        return;
      }

      router.push(`/r/${room.slug}`);
    } catch {
      setCreateError("Network error — could not create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    if (!displayName.trim() || !roomSlug.trim()) return;
    setDisplayName(displayName.trim());
    const params = new URLSearchParams();
    if (password) params.set("password", password);
    router.push(`/r/${roomSlug.trim()}${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <Music2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Together</span>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              v0.2.1
            </span>
          </div>
          <a
            href="#get-started"
            className="hidden text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] sm:inline"
          >
            Get started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-[var(--accent)]/20 blur-3xl" />
          <div className="absolute -right-32 top-24 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pb-28 md:pt-24">
          {kicked && (
            <div className="mb-8 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              You were removed from the room.
            </div>
          )}

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/80 px-4 py-1.5 text-sm text-[var(--text-muted)]">
              <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
              No account needed — start in seconds
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Watch and listen{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-violet-400 bg-clip-text text-transparent">
                together
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">
              Create a room, invite friends with a link, and sync YouTube playback in real time.
              Queue music democratically, chat with emoji, and host private listening sessions.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#get-started"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-8 text-base font-medium text-white transition-opacity hover:opacity-90"
              >
                Start a room
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-sm text-[var(--text-muted)]">
                Free · Works on desktop and mobile
              </p>
            </div>
          </div>

          {/* Highlight pills */}
          <div className="mx-auto mt-16 flex max-w-3xl flex-wrap justify-center gap-3">
            {[
              { icon: Headphones, label: "Audio-only mode" },
              { icon: SkipForward, label: "Vote to skip" },
              { icon: Shield, label: "Password rooms" },
              { icon: Clock, label: "Late-join sync" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-4 py-2 text-sm text-[var(--text-muted)]"
              >
                <Icon className="h-4 w-4 text-[var(--accent)]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {recentRooms.length > 0 && (
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/20 py-10">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-4 text-center text-xl font-bold md:text-left">Recent rooms</h2>
            <ul className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3">
              {recentRooms.map((room) => (
                <li key={room.slug}>
                  <Link
                    href={`/r/${room.slug}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-4 py-3 transition-colors hover:border-[var(--accent)]/40"
                  >
                    <span className="truncate font-medium">{room.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--text-muted)]">
                      /r/{room.slug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-secondary)]/30 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">How it works</h2>
            <p className="text-[var(--text-muted)]">Three steps to a shared listening session</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map(({ step, title, description }) => (
              <div key={step} className="relative text-center md:text-left">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Everything in v0.2.0</h2>
            <p className="mx-auto max-w-xl text-[var(--text-muted)]">
              Built for group listening — sync, queues, chat, and moderation out of the box.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {publicRooms.length > 0 && (
        <section className="border-t border-[var(--border)] py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-4 text-xl font-bold">Live public rooms</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {publicRooms.map((room) => (
                <li key={room.slug}>
                  <Link
                    href={`/r/${room.slug}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-4 py-3 transition-colors hover:border-[var(--accent)]/40"
                  >
                    <span className="truncate font-medium">{room.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--text-muted)]">
                      {room.participantCount} listening
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Get started */}
      <section id="get-started" className="border-t border-[var(--border)] bg-[var(--bg-secondary)]/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">Get started</h2>
            <p className="text-[var(--text-muted)]">Create a new room or join one you were invited to</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl shadow-black/20">
              <h3 className="mb-1 text-xl font-semibold">Create a room</h3>
              <p className="mb-5 text-sm text-[var(--text-muted)]">
                You&apos;ll be the host. Share the link when you&apos;re ready.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Your name</Label>
                  <Input
                    id="create-name"
                    value={displayName}
                    onChange={(e) => setDisplayNameState(e.target.value)}
                    placeholder="Display name"
                    maxLength={24}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="room-title">Room name (optional)</Label>
                  <Input
                    id="room-title"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Friday night vibes"
                    maxLength={64}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="privacy">Privacy</Label>
                  <select
                    id="privacy"
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
                    className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm"
                  >
                    <option value="unlisted">Unlisted (link only)</option>
                    <option value="public">Public</option>
                    <option value="private">Private (password)</option>
                  </select>
                </div>
                {privacy === "private" && (
                  <div>
                    <Label htmlFor="room-password">Room password</Label>
                    <Input
                      id="room-password"
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      minLength={4}
                      className="mt-1"
                    />
                  </div>
                )}
                {createError && <p className="text-sm text-red-400">{createError}</p>}
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={creating || !displayName.trim()}
                >
                  {creating ? "Creating..." : "Create room"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-xl shadow-black/20">
              <h3 className="mb-1 text-xl font-semibold">Join a room</h3>
              <p className="mb-5 text-sm text-[var(--text-muted)]">
                Enter the code from your invite link — e.g.{" "}
                <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs">/r/abc12345</code>
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="join-name">Your name</Label>
                  <Input
                    id="join-name"
                    value={displayName}
                    onChange={(e) => setDisplayNameState(e.target.value)}
                    placeholder="Display name"
                    maxLength={24}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="join-slug">Room code</Label>
                  <Input
                    id="join-slug"
                    value={roomSlug}
                    onChange={(e) => setRoomSlug(e.target.value.toLowerCase())}
                    placeholder="e.g. abc12345"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="join-password">Password (if private)</Label>
                  <Input
                    id="join-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleJoin}
                  disabled={!displayName.trim() || !roomSlug.trim()}
                >
                  Join room
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-[var(--text-muted)] sm:flex-row">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-[var(--accent)]" />
            <span>Together v0.2.1</span>
          </div>
          <p>Sync playback. Share the queue. No install required.</p>
        </div>
      </footer>
    </div>
  );
}
