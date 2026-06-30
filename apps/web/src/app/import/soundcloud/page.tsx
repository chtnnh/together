import { Suspense } from "react";
import SoundCloudImportClient from "./soundcloud-import-client";

export default function SoundCloudImportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <SoundCloudImportClient />
    </Suspense>
  );
}
