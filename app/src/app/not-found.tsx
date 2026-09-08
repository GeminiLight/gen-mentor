import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-xl font-semibold">There is nothing here</h1>
      <p className="max-w-md text-sm text-muted-foreground">The page may have moved, or the session index is not on your path.</p>
      <Button asChild>
        <Link href="/goals">Back to your goals</Link>
      </Button>
    </main>
  );
}
