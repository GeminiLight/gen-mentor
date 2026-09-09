"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";
import { countWords } from "@/lib/utils";

export interface GoalFormValues {
  learning_goal: string;
  learner_information: string;
  session_count: number;
}

/**
 * The submit button is always live. An empty field is pointed out on submit, next to the field,
 * with focus moved there; a disabled button that never says why is the thing this avoids.
 */
export function GoalForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (v: GoalFormValues) => void }) {
  const { goal, info, count: savedCount, patch } = useOnboardingDraft();
  const count = savedCount || "0";
  const setGoal = (goal: string) => patch({ goal });
  const setInfo = (info: string) => patch({ info });
  // Ignore the native select’s empty synchronization event during draft hydration.
  const setCount = (count: string) => { if (count) patch({ count }); };
  const [parsing, setParsing] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useT();
  // Short answers are allowed: the agents infer from whatever is there.
  const goalOk = goal.trim().length >= 3;
  const infoOk = info.trim().length >= 3;
  const goalInvalid = touched && !goalOk;
  const infoInvalid = touched && !infoOk;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      const { text, pages } = await api.parseResume(file);
      const prev = useOnboardingDraft.getState().info;
      setInfo(prev.trim() ? `${prev.trim()}\n\n${text}` : text);
      toast.success(t("onboarding.readPages", { pages, name: file.name }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("onboarding.readFailed"));
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!goalOk || !infoOk) {
          setTouched(true);
          (goalOk ? infoRef : goalRef).current?.focus();
          return;
        }
        onSubmit({ learning_goal: goal.trim(), learner_information: info.trim(), session_count: Number(count) });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="goal">{t("onboarding.goalLabel")}</Label>
        <Input
          ref={goalRef}
          id="goal"
          name="learning_goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={disabled}
          placeholder={t("onboarding.goalPlaceholder")}
          aria-invalid={goalInvalid || undefined}
          aria-describedby={goalInvalid ? "goal-error" : undefined}
          autoFocus
        />
        <p className="text-xs leading-relaxed text-muted-foreground">{t("polish.goalHelp")}</p>
        {goalInvalid && (
          <p id="goal-error" className="text-xs text-destructive" role="alert">
            {t("onboarding.goalRequired")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="info">{t("onboarding.infoLabel")}</Label>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" id="resume" aria-label={t("onboarding.uploadFile")} onChange={(e) => void onFile(e.target.files?.[0])} disabled={disabled || parsing} />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={disabled || parsing}>
            {parsing ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
            {parsing ? t("onboarding.reading") : t("onboarding.upload")}
          </Button>
        </div>
        <Textarea
          ref={infoRef}
          id="info"
          name="learner_information"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          disabled={disabled}
          rows={7}
          placeholder={t("onboarding.infoPlaceholder")}
          aria-invalid={infoInvalid || undefined}
          aria-describedby="info-hint"
        />
        <p id="info-hint" className={infoInvalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"} role={infoInvalid ? "alert" : undefined}>
          {infoInvalid ? t("onboarding.infoRequired") : info.trim().length < 40 ? t("onboarding.infoHintShort") : t("onboarding.infoWords", { n: countWords(info) })}
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label htmlFor="count">{t("onboarding.countLabel")}</Label>
          <Select value={count} onValueChange={setCount} disabled={disabled}>
            <SelectTrigger id="count" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("polish.adaptiveCount")}</SelectItem>
              {[3, 4, 5, 6, 8, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("onboarding.countOption", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={disabled || parsing}>
          {t("onboarding.submit")}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t(count === "0" ? "polish.adaptiveCountHelp" : "polish.countHelp")}</p>
      {(goal || info) && <p className="text-xs text-muted-foreground">{t("polish.savedDraft")}</p>}
    </form>
  );
}
