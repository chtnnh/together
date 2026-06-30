"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Label } from "@together/ui";

export default function SoundCloudImportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import/soundcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const items = await res.json();
      if (!res.ok) {
        throw new Error(typeof items.error === "string" ? items.error : "SoundCloud import failed");
      }

      sessionStorage.setItem("together_import_items", JSON.stringify(items));
      router.push(room ? `/r/${room}` : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "SoundCloud import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Import from SoundCloud</h1>
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        Paste a SoundCloud track or playlist URL. Tracks are matched to YouTube where possible.
      </p>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="space-y-3">
        <div>
          <Label htmlFor="soundcloud-url">SoundCloud URL</Label>
          <Input
            id="soundcloud-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://soundcloud.com/artist/track"
            className="mt-2"
          />
        </div>
        <Button onClick={handleImport} disabled={importing || !url.trim()}>
          {importing ? "Importing..." : "Import"}
        </Button>
      </div>
    </div>
  );
}
