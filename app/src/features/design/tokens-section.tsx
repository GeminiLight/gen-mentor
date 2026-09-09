import { Fragment } from "react";

// Class names are written out in full: Tailwind only emits utilities it can see in source.
const surfaces = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["popover", "bg-popover"],
  ["muted", "bg-muted"],
  ["secondary", "bg-secondary"],
  ["accent", "bg-accent"],
] as const;
const signals = [
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["success", "bg-success"],
  ["success-soft", "bg-success-soft"],
  ["warning", "bg-warning"],
  ["warning-soft", "bg-warning-soft"],
  ["destructive", "bg-destructive"],
  ["destructive-soft", "bg-destructive-soft"],
] as const;
const levels = [
  ["level-0", "bg-level-0"],
  ["level-1", "bg-level-1"],
  ["level-2", "bg-level-2"],
  ["level-3", "bg-level-3"],
] as const;
const knowledge = [
  ["kt-foundational", "bg-kt-foundational"],
  ["kt-practical", "bg-kt-practical"],
  ["kt-strategic", "bg-kt-strategic"],
] as const;
const sizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl"] as const;
const weights = ["font-normal", "font-medium", "font-semibold"] as const;
const widths = ["--w-rail", "--w-col", "--w-content", "--w-measure", "--w-dialog", "--w-tutor"] as const;
const durations = ["--dur-fast", "--dur-base", "--dur-slow"] as const;

function Swatches({ names }: { names: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {names.map(([label, cls]) => (
        <div key={label} className="space-y-1.5">
          <div className={`h-12 rounded-md border ${cls}`} />
          <p className="font-mono text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

export function TokensSection() {
  return (
    <section className="space-y-10" aria-labelledby="tokens">
      <h2 id="tokens" className="text-lg font-semibold">
        Tokens
      </h2>

      <div className="space-y-3">
        <p className="eyebrow">Surfaces</p>
        <Swatches names={surfaces} />
      </div>
      <div className="space-y-3">
        <p className="eyebrow">Signals · brand is the only saturated color in regular use</p>
        <Swatches names={signals} />
      </div>
      <div className="space-y-3">
        <p className="eyebrow">Mastery ramp · unlearned → advanced</p>
        <Swatches names={levels} />
      </div>
      <div className="space-y-3">
        <p className="eyebrow">Knowledge types</p>
        <Swatches names={knowledge} />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <p className="eyebrow">Type scale · six sizes</p>
          <div className="space-y-2">
            {sizes.map((s) => (
              <div key={s} className="flex items-baseline gap-4">
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{s}</span>
                <span className={`${s} truncate`}>The way there is built session by session.</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="eyebrow">Weights · three</p>
          <div className="space-y-2">
            {weights.map((w) => (
              <div key={w} className="flex items-baseline gap-4">
                <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{w}</span>
                <span className={`${w} text-lg`}>Skill gap identified</span>
              </div>
            ))}
          </div>
          <p className="eyebrow pt-4">Numbers · tabular</p>
          <p className="num text-xl font-semibold">
            72<span className="text-muted-foreground">%</span> · 1,284 min · 09:41
          </p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="col-span-2 eyebrow">Widths</dt>
          {widths.map((w) => (
            <Fragment key={w}>
              <dt className="font-mono text-xs whitespace-nowrap text-muted-foreground">{w}</dt>
              <dd className="min-w-0 overflow-hidden">
                <div className="h-2 max-w-full rounded-full bg-muted" style={{ width: `var(${w})` }} />
              </dd>
            </Fragment>
          ))}
        </dl>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          <dt className="col-span-2 eyebrow">Motion · respects reduced motion</dt>
          {durations.map((d) => (
            <Fragment key={d}>
              <dt className="font-mono text-xs whitespace-nowrap text-muted-foreground">{d}</dt>
              <dd>
                <div className="group h-6 w-40 rounded-md bg-muted p-1">
                  <div className={`h-4 w-4 rounded-sm bg-brand transition-transform group-hover:translate-x-32 duration-(${d})`} />
                </div>
              </dd>
            </Fragment>
          ))}
          <dd className="col-span-2 text-xs text-muted-foreground">Hover a track to see the clock.</dd>
        </dl>
      </div>
    </section>
  );
}
