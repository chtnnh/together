import { Suspense } from "react";
import SpotifyImportClient from "./spotify-import-client";

export default function SpotifyImportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <SpotifyImportClient />
    </Suspense>
  );
}
