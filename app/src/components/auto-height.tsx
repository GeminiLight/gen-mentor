"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Resize the surface, never scale its text or remount the controls inside it. */
export function AutoHeight({ children }: { children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const next = element.getBoundingClientRect().height;
      setHeight((current) => current !== undefined && Math.abs(current - next) < 0.5 ? current : next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div className="auto-height" style={{ height }}>
    <div ref={content} className="flow-root">{children}</div>
  </div>;
}
