"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n";
import type { DocumentQuiz, SessionItem, Source } from "@/lib/schemas";
import type { PracticeState, QuizDraft, QuizResults } from "@/lib/store/types";
import { DocumentView } from "./document-view";
import { QuizWorkspace } from "./quiz-workspace";
import { ReadingBookmark } from "./reading-bookmark";
import { scoredCount } from "@/lib/quiz";
import { ReadingProgress } from "./reading-progress";
import { AskTutor } from "./ask-tutor";
import { ReadingTools } from "./reading-tools";

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
  generating,
  onComplete,
  onRegenerate,
  onSubmitQuiz,
  practice, onPractice, draft, onDraft, quizStatus, readingAnchor, onReadingAnchor,
}: {
  session: SessionItem;
  /** The session after this one on the path, if any. */
  next?: { index: number; title: string };
  markdown: string;
  sources: Source[];
  quiz?: DocumentQuiz;
  practice?: PracticeState;
  onPractice: (practice: PracticeState) => void;
  draft?: QuizDraft;
  onDraft: (draft: QuizDraft) => void;
  quizStatus?: React.ReactNode;
  readingAnchor?: string;
  onReadingAnchor: (anchor: string) => void;
  results?: QuizResults;
  tab: string;
  onTab: (tab: string) => void;
  completing: boolean;
  generating: boolean;
  onComplete: () => void;
  onRegenerate: () => void;
  onSubmitQuiz: (r: QuizResults) => void;
}) {
  const { t } = useT();
  const tabsRef = useRef<HTMLDivElement>(null);
  const selectTab = (value: string) => {
    onTab(value);
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ block: "start" }));
  };
  const [askQuiz, setAskQuiz] = useState(false);
  const quizPending = !results && (!quiz || questionCount(quiz) > 0);
  const requestComplete = () => (quizPending ? setAskQuiz(true) : onComplete());

  const complete = (testid?: string) =>
    session.if_learned ? null : (
      <Button size="sm" variant={testid ? "outline" : "default"} onClick={requestComplete} disabled={completing} data-testid={testid}>
        <CheckCircle2 aria-hidden /> {completing ? t("session.completing") : t("session.complete")}
      </Button>
    );
  const nextLink =
    session.if_learned && next ? (
      <Button size="sm" variant="outline" asChild>
        <Link href={`/session/${next.index}`} data-testid="next-session">
          {t("polish.nextLesson")} <ArrowRight data-icon="inline-end" aria-hidden />
        </Link>
      </Button>
    ) : null;

  return (
    <Tabs ref={tabsRef} value={tab} onValueChange={selectTab} className="min-w-0 scroll-mt-6">
      <div className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b @lg/workspace:grid-cols-[auto_minmax(0,1fr)_auto] bg-background/95 py-3 backdrop-blur" data-testid="reading-toolbar">
        <TabsList>
          <TabsTrigger value="read">{t("session.read")}</TabsTrigger>
          <TabsTrigger value="quiz" data-testid="tab-quiz" disabled={!quiz}>
            {t("session.quiz")}
            {results && scoredCount(results) > 0 ? ` · ${results.correct}/${scoredCount(results)}` : ""}
          </TabsTrigger>
        </TabsList>
        <div className="col-start-2 row-start-1 justify-self-end @lg/workspace:col-start-3">
          <ReadingTools markdown={markdown} disabled={completing || generating} onRegenerate={onRegenerate} />
        </div>
        <div className="col-span-2 row-start-2 flex items-center justify-between gap-2 @lg/workspace:col-span-1 @lg/workspace:col-start-2 @lg/workspace:row-start-1 @lg/workspace:justify-end">
          <AskTutor />
          {complete("complete-session")}
        </div>
      </div>
      {!quiz && quizStatus}
      <TabsContent value="read" className="pt-6">
        <ReadingProgress />
        <ReadingBookmark anchor={readingAnchor} onSave={onReadingAnchor} />
        <DocumentView markdown={markdown} sources={sources} />
        <div className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t pt-6 lg:max-w-(--w-measure)" data-testid="reading-end">
          <div className="min-w-0 flex-1"><p className="text-sm font-medium">{t(results ? "journey.reviewLesson" : "journey.checkUnderstanding")}</p><p className="mt-1 text-sm text-muted-foreground">{t(results ? "journey.reviewLessonBody" : "journey.checkBody")}</p>{next && session.if_learned && <p className="mt-1 text-sm text-muted-foreground break-words">{next.title}</p>}</div>
          <div className="flex flex-wrap gap-2">
            <Button variant={!session.if_learned && quizPending && quiz ? "default" : "outline"} size="sm" disabled={!quiz} onClick={() => selectTab("quiz")}>
              {t("session.quiz")}
            </Button>
            {!quizPending && complete()}
            {nextLink}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="quiz" className="pt-6">
        {quiz ? <QuizWorkspace quiz={quiz} results={results} draft={draft} onDraft={onDraft} onSubmit={onSubmitQuiz} practice={practice} onPractice={onPractice} /> : quizStatus}
        {results && (!session.if_learned || next) && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6" data-testid="quiz-end">
            <p className="max-w-(--w-measure) text-sm text-muted-foreground">{session.if_learned ? "" : t("journey.savedAnswers")}</p>
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
            <DialogTitle>{t(quiz ? "session.skipQuizTitle" : "journey.quizUnavailable")}</DialogTitle>
            <DialogDescription>{t(quiz ? "session.skipQuizBody" : "journey.quizUnavailableBody")}</DialogDescription>
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
                if (quiz) selectTab("quiz");
              }}
            >
              {t(quiz ? "session.takeQuiz" : "journey.keepReading")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
