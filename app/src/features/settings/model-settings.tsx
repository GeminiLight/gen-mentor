"use client";

import { ModelFields } from "./model-fields";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { ByokHeaders, type Byok } from "@/lib/llm/config";
import { maskKey, useLLMSettings } from "@/lib/store/llm-settings";

const empty: Byok = { provider: "openai", apiKey: "", baseUrl: undefined, fastModel: "gpt-4.1-mini", smartModel: "gpt-4.1", disableThinking: false };

/** Bring your own key, discover models, and optionally test the connection before saving. */
export function ModelSettings({ trigger, open: controlledOpen, onOpenChange }: { trigger?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { t } = useT();
  const { byok, setByok } = useLLMSettings();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [form, setForm] = useState<Byok>(byok ?? empty);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const set = (patch: Partial<Byok>) => { setResult(null); setForm((f) => ({ ...f, ...patch })); };
  const parsed = ByokHeaders.safeParse({ ...form, baseUrl: form.baseUrl || undefined, fastModel: form.fastModel || undefined, smartModel: form.smartModel || undefined });

  const test = async () => {
    if (!parsed.success) return;
    setTesting(true);
    setResult(null);
    try {
      const r = await api.testLLM(parsed.data);
      setResult(t("settings.testOk", { model: r.model, ms: r.ms, reply: r.reply }));
    } catch (e) {
      setResult(e instanceof Error ? e.message : t("settings.testFailed"));
    } finally {
      setTesting(false);
    }
  };
  const save = () => {
    if (!parsed.success) return;
    setByok(parsed.data);
    toast.success(t("settings.saved"), { description: t("polish.modelUnverified") });
    setOpen(false);
  };
  const clear = () => {
    setByok(null);
    setForm(empty);
    setResult(null);
    toast.success(t("settings.cleared"));
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setForm(byok ?? empty);
          setResult(null);
        }
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("settings.title")} data-testid="open-model-settings">
                <KeyRound aria-hidden />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("settings.title")}</TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="sm:max-w-(--w-dialog)">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{byok ? t("settings.usingOwn", { key: maskKey(byok.apiKey) }) : t("settings.lede")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="llm-provider">{t("settings.provider")}</Label>
            <Select value={form.provider} onValueChange={(v) => set({ provider: v as Byok["provider"], baseUrl: undefined, fastModel: v === "openai" ? "gpt-4.1-mini" : "claude-sonnet-5", smartModel: v === "openai" ? "gpt-4.1" : "claude-opus-5" })}>
              <SelectTrigger id="llm-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">{t("settings.providerOpenAI")}</SelectItem>
                <SelectItem value="anthropic">{t("settings.providerAnthropic")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="llm-key">{t("settings.apiKey")}</Label>
            <Input id="llm-key" type="password" autoComplete="off" value={form.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-…" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="llm-url">{t("settings.baseUrl")}</Label>
            <Input id="llm-url" value={form.baseUrl ?? ""} onChange={(e) => set({ baseUrl: e.target.value })} placeholder={form.provider === "openai" ? "https://api.openai.com/v1" : "https://api.anthropic.com"} />
          </div>
          <ModelFields key={JSON.stringify([form.provider, form.baseUrl, form.apiKey])} form={form} onChange={set} />
          <p className="text-xs text-muted-foreground">{t("settings.privacy")}</p>
          {!parsed.success && form.apiKey && <p role="alert" className="text-xs text-destructive">{t("polish.modelFields")}</p>}
          {result && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs" role="status" data-testid="llm-test-result">
              {result}
            </p>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <div>{byok && <Button variant="ghost" onClick={clear}>{t("settings.useServer")}</Button>}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void test()} disabled={!parsed.success || testing}>
              {testing ? t("settings.testing") : t("settings.test")}
            </Button>
            <Button onClick={save} disabled={!parsed.success}>
              {t("settings.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
