"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** Route-level error boundary: say what broke, keep the shell, offer a way back. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <EmptyState
      title="Something went wrong on this page"
      body={error.message || "An unexpected error occurred. Your archive is untouched."}
      action={
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      }
    />
  );
}
