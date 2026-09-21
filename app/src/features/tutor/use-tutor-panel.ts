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

let contextualTrigger: HTMLButtonElement | null = null;
export function openTutorFrom(button: HTMLButtonElement) {
  contextualTrigger = button;
  usePreference.getState().set({ open: true });
  requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("[data-tutor-composer]")?.focus({ preventScroll: true }));
}

export function useTutorPanel() {
  const preference = usePreference();
  const wide = useSyncExternalStore(subscribe, wideSnapshot, serverSnapshot);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const focusReturned = useRef(false);
  useEffect(() => { void usePreference.persist.rehydrate(); }, []);
  useEffect(() => { if (preference.open) focusReturned.current = false; }, [preference.open]);
  const restoreFocus = () => {
    requestAnimationFrame(() => {
      // close() and the sheet's exit callback share this path. A second focus can
      // clear a new reading selection made while the sheet finishes animating.
      if (usePreference.getState().open || focusReturned.current) return;
      const visibleTrigger = contextualTrigger?.isConnected && contextualTrigger.getClientRects().length ? contextualTrigger :
        trigger.current?.getClientRects().length ? trigger.current :
          Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tutor-trigger]")).find((el) => el.getClientRects().length);
      visibleTrigger?.focus({ preventScroll: true });
      focusReturned.current = !!visibleTrigger && document.activeElement === visibleTrigger;
    });
  };
  return {
    open: preference.open,
    wide,
    docked: preference.open && preference.pinned && wide,
    show: (button: HTMLButtonElement) => { contextualTrigger = null; trigger.current = button; preference.set({ open: true }); },
    close: () => { preference.set({ open: false }); restoreFocus(); },
    togglePin: () => preference.set({ pinned: !preference.pinned, open: true }),
    restoreFocus,
  };
}
export type TutorPanelState = ReturnType<typeof useTutorPanel>;
