"use client";

import { useEffect, useState } from "react";

/** A hairline at the top of the viewport showing how far down the document the reader is. */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, Math.round((el.scrollTop / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent" aria-hidden data-testid="reading-progress" data-pct={pct}>
      <div className="h-full bg-brand transition-[width] duration-(--dur-fast)" style={{ width: `${pct}%` }} />
    </div>
  );
}
