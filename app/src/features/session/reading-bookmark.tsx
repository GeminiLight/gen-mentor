"use client";

import { useEffect, useRef } from "react";

/** Restore once, then save the nearest chapter after scrolling settles. */
export function ReadingBookmark({ anchor, onSave }: { anchor?: string; onSave: (anchor: string) => void }) {
  const initial = useRef(anchor);
  const save = useRef(onSave);
  useEffect(() => { save.current = onSave; }, [onSave]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      const id = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : initial.current;
      if (id) document.getElementById(id)?.scrollIntoView();
    });
    const scrolled = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const headings = [...document.querySelectorAll<HTMLElement>("article.reading h2[id], article.reading h3[id]")];
        const current = headings.filter((h) => h.getBoundingClientRect().top <= 180).at(-1);
        if (current) save.current(current.id);
      }, 250);
    };
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener("scroll", scrolled); };
  }, []);
  return null;
}
