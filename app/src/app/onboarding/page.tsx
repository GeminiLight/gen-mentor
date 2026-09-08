import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Start with a goal" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-6">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          GenMentor
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/goals" className="text-sm text-muted-foreground hover:text-foreground">
            My goals
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="mb-10 max-w-(--w-measure)">
        <p className="eyebrow">New goal</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Tell it where you want to be.</h1>
        <p className="mt-2 text-sm text-muted-foreground">GenMentor refines the goal, finds the gap between it and your background, and schedules a path of sessions written for you.</p>
      </div>
      <OnboardingFlow />
    </main>
  );
}
