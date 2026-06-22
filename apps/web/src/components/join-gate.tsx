"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@together/ui";
import Link from "next/link";

interface JoinGateProps {
  slug: string;
}

export function JoinGateClient({ slug }: JoinGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/rooms/${slug}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Could not join room");
        return;
      }

      router.push(`/r/${slug}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6"
      >
        <h1 className="text-xl font-bold">Private room</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Enter the room password to continue.
        </p>

        {error === "wrong_password" && (
          <p className="text-sm text-red-400">Incorrect password. Try again.</p>
        )}
        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <div>
          <Label htmlFor="password">Room password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Joining..." : "Enter room"}
        </Button>

        <p className="text-center text-xs text-[var(--text-muted)]">
          <Link href="/" className="underline hover:text-[var(--text)]">
            Back to home
          </Link>
        </p>
      </form>
    </div>
  );
}
