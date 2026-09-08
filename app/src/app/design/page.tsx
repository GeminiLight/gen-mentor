import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSection } from "@/features/design/command-section";
import { ControlsSection } from "@/features/design/controls-section";
import { SurfacesSection } from "@/features/design/surfaces-section";
import { TokensSection } from "@/features/design/tokens-section";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

/**
 * Visual regression target: every primitive and every state on one page, screenshotted in
 * three viewports and both themes by e2e. Not linked from the product.
 */
export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-(--w-content) px-6 py-8">
      <header className="mb-12 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">GenMentor</p>
          <h1 className="mt-1 text-xl font-semibold">Design system</h1>
          <p className="mt-2 max-w-(--w-measure) text-sm text-muted-foreground">
            Tokens live in <code className="font-mono text-xs">globals.css</code>. This page exists so a change there is seen everywhere at once.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="space-y-16">
        <TokensSection />
        <ControlsSection />
        <SurfacesSection />
        <CommandSection />
      </div>
    </main>
  );
}
