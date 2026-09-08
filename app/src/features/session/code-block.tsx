"use client";

import { useEffect, useState } from "react";
import type { BundledLanguage, ThemedToken } from "shiki/bundle/web";

/**
 * Syntax highlighting without innerHTML: shiki tokenizes on the client and each token becomes a
 * span carrying both theme colors as CSS variables, so the block follows the page theme.
 */
const LANGS = new Set(["python", "py", "sql", "javascript", "js", "typescript", "ts", "bash", "sh", "shell", "json", "yaml", "yml", "html", "css", "r", "markdown", "md"]);

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const language = lang && LANGS.has(lang) ? lang : "text";

  useEffect(() => {
    let alive = true;
    if (language === "text") return;
    import("shiki/bundle/web")
      .then(({ codeToTokens }) => codeToTokens(code, { lang: language as BundledLanguage, themes: { light: "github-light", dark: "github-dark" }, defaultColor: false }))
      .then((res) => alive && setTokens(res.tokens))
      .catch(() => alive && setTokens(null));
    return () => {
      alive = false;
    };
  }, [code, language]);

  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/60 p-4 text-sm leading-relaxed" data-lang={language}>
      <code className="font-mono">
        {tokens
          ? tokens.map((line, i) => (
              <span key={i} className="block min-h-[1lh]">
                {line.map((t, j) => (
                  <span key={j} style={t.htmlStyle as React.CSSProperties} className="[color:var(--shiki-light)] dark:[color:var(--shiki-dark)]">
                    {t.content}
                  </span>
                ))}
              </span>
            ))
          : code}
      </code>
    </pre>
  );
}
