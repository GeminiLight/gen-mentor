"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Goal } from "@/lib/store";
import { sessionMinutes, sessionUid } from "@/lib/store/derive";

const fmtDay = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Tip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string | number; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="num font-medium">
        {payload[0].value}
        {unit}
      </p>
    </div>
  );
}

/** Mastery rate at each profile rebuild. One series, so no legend; the title names it. */
export function MasteryLine({ goal }: { goal: Goal }) {
  const data = goal.mastery_history.map((p) => ({ t: fmtDay(p.ts), rate: Math.round(p.rate * 100), progress: p.overall_progress }));
  if (data.length < 2) return <p className="py-8 text-center text-sm text-muted-foreground">Complete a session and the line starts here.</p>;
  return (
    <div className="h-48" data-testid="mastery-line">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip content={<Tip unit="%" />} cursor={{ stroke: "var(--border)" }} />
          <Line type="monotone" dataKey="rate" stroke="var(--brand)" strokeWidth={2} dot={{ r: 4, fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Minutes spent per session, from open to completion timestamps. */
export function MinutesBars({ goal }: { goal: Goal }) {
  const data = goal.learning_path.map((s, i) => ({ n: `S${i + 1}`, min: sessionMinutes(goal.sessions[sessionUid(goal.id, i)]), title: s.title }));
  const total = data.reduce((a, d) => a + d.min, 0);
  if (total === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Time is recorded as you open and complete sessions.</p>;
  return (
    <div className="h-48" data-testid="minutes-bars">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="n" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<Tip unit=" min" />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="min" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
