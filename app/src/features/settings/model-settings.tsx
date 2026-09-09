"use client";

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

const empty: Byok = { provider: "openai", apiKey: "", baseUrl: undefined, fastModel: undefined, smartModel: undefined, disableThinking: false };

/** Bring your own key: provider, endpoint, key and models, tested live before saving. */
export function ModelSettings({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useT();
  const { byok, setByok } = useLLMSettings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Byok>(byok ?? empty);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const set = (patch: Partial<Byok>) => setForm((f) => ({ ...f, ...patch }));
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
    toast.success(t("settings.saved"));
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
            <Select value={form.provider} onValueChange={(v) => set({ provider: v as Byok["provider"] })}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="llm-fast">{t("settings.fastModel")}</Label>
              <Input id="llm-fast" value={form.fastModel ?? ""} onChange={(e) => set({ fastModel: e.target.value })} placeholder={form.provider === "openai" ? "gpt-4.1-mini" : "claude-sonnet-5"} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="llm-smart">{t("settings.smartModel")}</Label>
              <Input id="llm-smart" value={form.smartModel ?? ""} onChange={(e) => set({ smartModel: e.target.value })} placeholder={form.provider === "openai" ? "gpt-4.1" : "claude-opus-5"} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.privacy")}</p>
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
