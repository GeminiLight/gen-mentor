"use client";

import { Slider } from "radix-ui";

/** A discrete level control with a large pointer target and keyboard support. */
export function LevelSlider({ value, min = 0, label, valueText, disabled, onChange }: {
  value: number; min?: number; label: string; valueText: string; disabled?: boolean; onChange: (value: number) => void;
}) {
  return (
    <Slider.Root min={min} max={3} step={1} value={[value]} disabled={disabled} onFocus={(e) => { if (e.target.matches(":focus-visible")) e.currentTarget.scrollIntoView({ block: "center" }); }} onKeyDown={(e) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) e.currentTarget.scrollIntoView({ block: "center", behavior: "instant" }); }} onValueChange={([next]) => onChange(next)} className="relative flex h-11 w-full touch-none select-none items-center data-disabled:opacity-50">
      <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
        <Slider.Range className="absolute h-full rounded-full bg-primary" />
      </Slider.Track>
      <Slider.Thumb aria-label={label} aria-valuetext={valueText} className="block size-5 rounded-full border-2 border-primary bg-background shadow-xs outline-none ring-offset-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2" />
    </Slider.Root>
  );
}
