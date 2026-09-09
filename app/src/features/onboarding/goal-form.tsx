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

export interface GoalFormValues {
  learning_goal: string;
  learner_information: string;
  session_count: number;
}

export function GoalForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (v: GoalFormValues) => void }) {
  const [goal, setGoal] = useState("");
  const [info, setInfo] = useState("");
  const [count, setCount] = useState("5");
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useT();
  const goalOk = goal.trim().length >= 12;
  const infoOk = info.trim().length >= 40;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      const { text, pages } = await api.parseResume(file);
      setInfo((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
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
      onSubmit={(e) => {
        e.preventDefault();
        if (goalOk && infoOk) onSubmit({ learning_goal: goal.trim(), learner_information: info.trim(), session_count: Number(count) });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="goal">{t("onboarding.goalLabel")}</Label>
        <Input id="goal" name="learning_goal" value={goal} onChange={(e) => setGoal(e.target.value)} disabled={disabled} placeholder={t("onboarding.goalPlaceholder")} autoFocus />
        <p className="text-xs text-muted-foreground">{t("onboarding.goalHint")}</p>
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
          id="info"
          name="learner_information"
          value={info}
          onChange={(e) => setInfo(e.target.value)}
          disabled={disabled}
          rows={7}
          placeholder={t("onboarding.infoPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">
          {info.trim().length < 40 ? t("onboarding.infoHintShort") : t("onboarding.infoWords", { n: info.trim().split(/\s+/).length })}
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
              {[3, 4, 5, 6, 8, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("onboarding.countOption", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="lg" disabled={disabled || !goalOk || !infoOk}>
          {t("onboarding.submit")}
        </Button>
      </div>
    </form>
  );
}
