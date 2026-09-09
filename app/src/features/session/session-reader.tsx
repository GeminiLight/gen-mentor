"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import type { DocumentQuiz, SessionItem, Source } from "@/lib/schemas";
import type { QuizResults } from "@/lib/store/types";
import { DocumentView } from "./document-view";
import { QuizView } from "./quiz-view";
import { ReadingProgress } from "./reading-progress";
import { RegenerateButton } from "./regenerate-button";

const questionCount = (q: DocumentQuiz) =>
  q.single_choice_questions.length + q.multiple_choice_questions.length + q.true_false_questions.length + q.short_answer_questions.length;

/**
 * The finished session: reading and quiz as two tabs. "Mark done" appears in the toolbar and
 * again where the learner actually ends up, after the last paragraph and after the quiz score.
 * Marking done with an untaken quiz asks first: the quiz is what moves the profile.
 */
export function SessionReader({
  session,
  next,
  markdown,
  sources,
  quiz,
  results,
  tab,
  onTab,
  completing,
  onComplete,
  onRegenerate,
  onSubmitQuiz,
}: {
  session: SessionItem;
  /** The session after this one on the path, if any. */
  next?: { index: number; title: string };
  markdown: string;
  sources: Source[];
  quiz: DocumentQuiz;
  results?: QuizResults;
  tab: string;
  onTab: (tab: string) => void;
  completing: boolean;
  onComplete: () => void;
  onRegenerate: () => void;
  onSubmitQuiz: (r: QuizResults) => void;
}) {
  const { t } = useT();
  const [askQuiz, setAskQuiz] = useState(false);
  const quizPending = !results && questionCount(quiz) > 0;
  const requestComplete = () => (quizPending ? setAskQuiz(true) : onComplete());

  const complete = (testid?: string) =>
    session.if_learned ? null : (
      <Button size="sm" onClick={requestComplete} disabled={completing} data-testid={testid}>
        <CheckCircle2 aria-hidden /> {completing ? t("session.completing") : t("session.complete")}
      </Button>
    );
  const nextLink =
    session.if_learned && next ? (
      <Button size="sm" variant="outline" asChild>
        <Link href={`/session/${next.index}`} data-testid="next-session">
          {t("session.nextSession", { title: next.title })} <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    ) : null;

  return (
    <Tabs value={tab} onValueChange={onTab}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="read">{t("session.read")}</TabsTrigger>
          <TabsTrigger value="quiz" data-testid="tab-quiz">
            {t("session.quiz")}
            {results ? ` · ${results.correct}/${results.answered}` : ""}
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <RegenerateButton disabled={completing} onConfirm={onRegenerate} />
          {complete("complete-session")}
        </div>
      </div>
      <TabsContent value="read" className="pt-6">
        <ReadingProgress />
        <DocumentView markdown={markdown} sources={sources} />
        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t pt-6 lg:max-w-(--w-measure)" data-testid="reading-end">
          <p className="text-sm text-muted-foreground">{t("session.finishedReading")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant={session.if_learned ? "ghost" : "outline"} size="sm" onClick={() => onTab("quiz")}>
              {t("session.quiz")}
            </Button>
            {complete()}
            {nextLink}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="quiz" className="pt-6">
        <QuizView key={results?.submittedAt ?? "fresh"} quiz={quiz} results={results} onSubmit={onSubmitQuiz} />
        {results && (!session.if_learned || next) && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6" data-testid="quiz-end">
            <p className="max-w-(--w-measure) text-sm text-muted-foreground">{session.if_learned ? "" : t("session.quizDoneHint")}</p>
            <div className="flex flex-wrap gap-2">
              {complete()}
              {nextLink}
            </div>
          </div>
        )}
      </TabsContent>

      <Dialog open={askQuiz} onOpenChange={setAskQuiz}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("session.skipQuizTitle")}</DialogTitle>
            <DialogDescription>{t("session.skipQuizBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              data-testid="complete-anyway"
              onClick={() => {
                setAskQuiz(false);
                onComplete();
              }}
            >
              {t("session.completeAnyway")}
            </Button>
            <Button
              onClick={() => {
                setAskQuiz(false);
                onTab("quiz");
              }}
            >
              {t("session.takeQuiz")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
