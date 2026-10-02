"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the thread every two seconds, so replies show up as they land. */
export function Refresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
