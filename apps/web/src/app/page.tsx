import { Suspense } from "react";
import HomePageClient from "./home-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <HomePageClient />
    </Suspense>
  );
}
