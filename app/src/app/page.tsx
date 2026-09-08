import { ArrowRight, Compass, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { ContinueLink } from "@/features/system/continue-link";
import { HealthBadge } from "@/features/system/health-badge";

const steps = [
  { icon: Compass, title: "Name the goal", body: "Describe where you want to be. GenMentor refines it into something a path can be built against." },
  { icon: Route, title: "See the gap", body: "Your background is compared with the skills the goal demands, level by level, with the reasoning shown." },
  { icon: Sparkles, title: "Learn by session", body: "A schedule of sessions, each with tailored reading and a quiz, adapting as your mastery changes." },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-semibold tracking-tight">GenMentor</span>
        <HealthBadge />
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium text-muted-foreground">Goal-oriented learning, run by agents</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Tell it where you want to be. It builds the way there.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          A multi-agent mentor that turns a career goal into a skill gap, a learning path, and sessions written for you.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            href="/onboarding"
            className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start with a goal
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <span className="text-sm text-muted-foreground">No account. Your progress stays on this device.</span>
        </div>
        <div className="mt-4 min-h-6">
          <ContinueLink />
        </div>

        <ol className="mt-20 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h2 className="mt-4 font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
