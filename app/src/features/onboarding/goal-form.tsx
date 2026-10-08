"use client";

import { FileUp, Loader2, ArrowRight, Check, KeyRound, CircleCheck, Plug, CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";
import { ModelSettings } from "@/features/settings/model-settings";
import { useEntryModel } from "./use-entry-model";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const model = useEntryModel();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);
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
      if (!mounted.current) return;
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
      className="goal-composer space-y-7"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!goalOk || !infoOk) {
          setTouched(true);
          (goalOk ? infoRef : goalRef).current?.focus();
          return;
        }
        if (disabled || parsing || checking) return;
        if (model.state !== "ready") {
          setChecking(true);
          const state = await model.check();
          if (!mounted.current) return;
          setChecking(false);
          if (state === "missing") { setSettingsOpen(true); return; }
          if (state !== "ready") return;
        }
        onSubmit({ learning_goal: goal.trim(), learner_information: info.trim(), session_count: Number(count) });
      }}
    >
      <div className="composer-field space-y-3">
        <div className="flex items-center gap-2"><span className="field-index" aria-hidden>01</span><Label htmlFor="goal">{t("onboarding.goalLabel")}</Label></div>
        <Textarea
          ref={goalRef}
          id="goal"
          name="learning_goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={disabled}
          placeholder={t("onboarding.goalPlaceholder")}
          aria-invalid={goalInvalid || undefined}
          aria-describedby={goalInvalid ? "goal-error" : undefined}
          rows={2}
          className="min-h-24 resize-y bg-background/40 px-4 py-4 text-base leading-relaxed focus:bg-card"
        />
        {!goal.trim() && <div className="pt-1"><div className="flex flex-wrap gap-1" role="group" aria-label={t("entry.examples")}>{(["data", "agents", "career"] as const).map((key) => <Button key={key} variant="outline" size="sm" type="button" className="example-choice min-h-9" disabled={disabled} onClick={() => { setGoal(t(`entry.${key}Goal`)); goalRef.current?.focus(); }}>{t(`entry.${key}`)}</Button>)}</div></div>}
        {goalInvalid && (
          <p id="goal-error" className="text-xs text-destructive" role="alert">
            {t("onboarding.goalRequired")}
          </p>
        )}
      </div>

      <div className="composer-field space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><span className="field-index" aria-hidden>02</span><Label htmlFor="info">{t("onboarding.infoLabel")}</Label></div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" id="resume" aria-label={t("onboarding.uploadFile")} onChange={(e) => void onFile(e.target.files?.[0])} disabled={disabled || parsing} />
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={disabled || parsing}>
            {parsing ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
            {parsing ? t("onboarding.reading") : t("onboarding.upload")}
            {!parsing && <span className="text-xs text-muted-foreground">{t("entry.optional")}</span>}
          </Button>
        </div>
        <Textarea
          ref={infoRef}
          id="info"
          name="learner_information"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          disabled={disabled}
          rows={4}
          className="min-h-28 resize-y bg-background/40 px-4 py-4 leading-relaxed focus:bg-card"
          placeholder={t("entry.backgroundHelp")}
          aria-invalid={infoInvalid || undefined}
          aria-describedby={infoInvalid ? "info-error" : undefined}
        />
        {infoInvalid && <p id="info-error" className="text-xs text-destructive" role="alert">{t("onboarding.infoRequired")}</p>}
      </div>

      <div className="border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><span className="field-index" aria-hidden>03</span><Label htmlFor="count">{t("onboarding.countLabel")}</Label></div>
          <Select value={count} onValueChange={setCount} disabled={disabled}>
            <SelectTrigger id="count" className="min-h-11 w-40">
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
      </div>
      <div className="space-y-4 border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2" data-testid="entry-model">
          <p className="flex min-w-0 flex-1 basis-48 items-start gap-2 text-xs leading-relaxed text-muted-foreground" role="status">{model.state === "ready" ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> : model.state === "loading" ? <Loader2 className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin" aria-hidden /> : model.state === "offline" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Plug className="mt-0.5 size-4 shrink-0" aria-hidden />}{t(model.state === "ready" ? "entry.modelReady" : model.state === "loading" ? "entry.modelChecking" : model.state === "offline" ? "entry.modelOffline" : "entry.modelNeeded")}</p>
          <ModelSettings open={settingsOpen} onOpenChange={setSettingsOpen} trigger={<Button type="button" variant="ghost" size="sm" className="min-h-11"><KeyRound aria-hidden />{t(model.state === "ready" ? "settings.title" : "entry.configure")}</Button>} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{(goal || info) && <><Check className="size-3" aria-hidden />{t("entry.saved")}</>}</span>
          <Button type="submit" size="lg" className="h-12 w-full px-5 sm:ml-auto sm:w-auto" disabled={disabled || parsing || checking}>
            {checking ? t("entry.modelChecking") : t("entry.analyze")}<ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </div>
      </div>
    </form>
  );
}
