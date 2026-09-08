"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveGoal, useArchive } from "@/lib/store";
import { sessionMinutes, sessionUid } from "@/lib/store/derive";

/** Every document generated for the active goal, whether or not the session was completed. */
export function LibraryView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title="No active goal" body="The library fills with documents as you open sessions." action={<Button asChild><Link href="/goals">Go to goals</Link></Button>} />;

  const docs = goal.learning_path
    .map((s, i) => ({ session: s, index: i, state: goal.sessions[sessionUid(goal.id, i)] }))
    .filter((d) => d.state?.document);

  return (
    <>
      <PageHeader eyebrow="Library" title="Everything written for you" description="Documents stay here after you finish a session, with the quiz result and the sources they drew on." />
      {docs.length === 0 ? (
        <EmptyState title="Nothing generated yet" body="Open a session on your path and its document will appear here." action={<Button asChild><Link href="/learning-path">Open the path</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map(({ session, index, state }) => (
            <Link key={index} href={`/session/${index}`} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors group-hover:border-foreground/20" data-testid="library-card">
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="size-3.5" aria-hidden /> {session.id}
                    {session.if_learned && <Badge className="ml-auto bg-success-soft text-success">Learned</Badge>}
                  </div>
                  <CardTitle className="leading-snug">{state!.document!.structure.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{state!.document!.structure.overview}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="num">{state!.knowledge_points?.length ?? 0} points</span>
                  <span className="num">{state!.knowledge_drafts?.reduce((a, d) => a + d.sources.length, 0) ?? 0} sources</span>
                  {state!.quiz_results && (
                    <span className="num">
                      quiz {state!.quiz_results.correct}/{state!.quiz_results.answered}
                    </span>
                  )}
                  {sessionMinutes(state) > 0 && <span className="num">{sessionMinutes(state)} min</span>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
