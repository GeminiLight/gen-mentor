"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const wideQuery = "(min-width: 1280px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(wideQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const wideSnapshot = () => window.matchMedia(wideQuery).matches;
const serverSnapshot = () => false;

const usePreference = create<{ pinned: boolean; open: boolean; set: (value: { pinned?: boolean; open?: boolean }) => void }>()(persist(
  (set) => ({ pinned: false, open: false, set }),
  { name: "genmentor.tutor-panel.v1", skipHydration: true, partialize: ({ pinned, open }) => ({ pinned, open: pinned && open }) },
));

export function useTutorPanel() {
  const preference = usePreference();
  const wide = useSyncExternalStore(subscribe, wideSnapshot, serverSnapshot);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { void usePreference.persist.rehydrate(); }, []);
  const restoreFocus = () => {
    requestAnimationFrame(() => {
      if (usePreference.getState().open) return;
      const visibleTrigger = trigger.current?.getClientRects().length ? trigger.current :
        Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tutor-trigger]")).find((el) => el.getClientRects().length);
      visibleTrigger?.focus();
    });
  };
  return {
    open: preference.open,
    wide,
    docked: preference.open && preference.pinned && wide,
    show: (button: HTMLButtonElement) => { trigger.current = button; preference.set({ open: true }); },
    close: () => { preference.set({ open: false }); restoreFocus(); },
    togglePin: () => preference.set({ pinned: !preference.pinned, open: true }),
    restoreFocus,
  };
}
export type TutorPanelState = ReturnType<typeof useTutorPanel>;
