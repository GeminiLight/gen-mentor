"use client";

import { useState } from "react";
import type { SessionItem } from "@/lib/schemas";
import type { Goal } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { skillLevels } from "@/lib/store/derive";
import { cn } from "@/lib/utils";

const LEVELS = ["unlearned", "beginner", "intermediate", "advanced"] as const;
const FILL = ["fill-level-0", "fill-level-1", "fill-level-2", "fill-level-3"];
const COL = 168;
const ROW = 92;
const SESSION_R = 9;

/**
 * Goal → skills → sessions. A skill node's ring is its current level over the required one
 * (from the profile); a session node is lit only once it is learned. Both come straight from
 * the archive, so the tree cannot show progress that did not happen.
 */
export function SkillTree({ goal }: { goal: Goal }) {
  const skills = skillLevels(goal.learner_profile);
  const [focus, setFocus] = useState<string | null>(null);
  const { t } = useT();
  const cols = Math.max(skills.length, 1);
  const width = cols * COL;
  const sessionsOf = (name: string) => goal.learning_path.map((s, i) => ({ s, i })).filter(({ s }) => s.desired_outcome_when_completed.some((o) => o.name === name));
  const maxSessions = Math.max(1, ...skills.map((k) => sessionsOf(k.name).length));
  const height = ROW * 2 + maxSessions * (SESSION_R * 2 + 10) + 24;
  const x = (i: number) => COL * i + COL / 2;

  if (skills.length === 0) return <p className="text-sm text-muted-foreground">{t("progress.noSkills")}</p>;

  return (
    <div className="overflow-x-auto" data-testid="skill-tree">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto block min-w-full" role="img" aria-label={t("progress.treeAria", { skills: skills.length, sessions: goal.learning_path.length })}>
        {/* goal */}
        <g>
          <rect x={width / 2 - 60} y={12} width={120} height={28} rx={14} className="fill-foreground" />
          <text x={width / 2} y={26} dominantBaseline="central" textAnchor="middle" className="fill-background text-xs font-medium">
            {t("progress.goal")}
          </text>
        </g>
        {skills.map((k, i) => {
          const cx = x(i);
          const cy = ROW + 10;
          const dim = focus !== null && focus !== k.name;
          const sessions = sessionsOf(k.name);
          return (
            <g key={k.name} className={cn("transition-opacity duration-(--dur-base)", dim && "opacity-30")} onMouseEnter={() => setFocus(k.name)} onMouseLeave={() => setFocus(null)} data-testid="skill-node" data-level={k.currentRank}>
              <path d={`M ${width / 2} 40 C ${width / 2} 70, ${cx} 50, ${cx} ${cy - 22}`} fill="none" strokeWidth={1.5} className="stroke-border" />
              {[0, 1, 2].map((step) => (
                <circle key={step} cx={cx} cy={cy} r={22 - step * 6} fill="none" strokeWidth={4} className={cn(step < k.currentRank ? `stroke-level-${k.currentRank}` : step < k.requiredRank ? "stroke-muted" : "stroke-transparent")} />
              ))}
              <circle cx={cx} cy={cy} r={6} className={cn(k.mastered ? FILL[3] : FILL[k.currentRank])} />
              <text x={cx} y={cy + 36} textAnchor="middle" className="fill-foreground text-xs font-medium">
                {k.name.length > 22 ? `${k.name.slice(0, 21)}…` : k.name}
              </text>
              <text x={cx} y={cy + 50} textAnchor="middle" className="fill-muted-foreground text-xs">
                {t(`levels.${LEVELS[k.currentRank]}`)} → {t(`levels.${LEVELS[k.requiredRank]}`)}
              </text>
              {sessions.map(({ s, i: si }, j) => (
                <SessionNode key={si} session={s} index={si} cx={cx} cy={cy + 74 + j * (SESSION_R * 2 + 10)} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SessionNode({ session, index, cx, cy }: { session: SessionItem; index: number; cx: number; cy: number }) {
  return (
    <g data-testid="session-node" data-learned={session.if_learned || undefined}>
      <line x1={cx} y1={cy - SESSION_R - 10} x2={cx} y2={cy - SESSION_R} strokeWidth={1.5} className="stroke-border" />
      <circle cx={cx} cy={cy} r={SESSION_R} strokeWidth={1.5} className={cn(session.if_learned ? "fill-brand stroke-brand" : "fill-background stroke-border")} />
      <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" className={cn("num text-xs", session.if_learned ? "fill-brand-foreground" : "fill-muted-foreground")}>
        {index + 1}
      </text>
      <title>
        {session.id}: {session.title}
      </title>
    </g>
  );
}
