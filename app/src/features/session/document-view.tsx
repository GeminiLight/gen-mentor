import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Source } from "@/lib/schemas";
import { CodeBlock } from "./code-block";

/** The learning document, typeset for reading. Headings are the integrator's section structure. */
export function DocumentView({ markdown, sources }: { markdown: string; sources: Source[] }) {
  return (
    <article className="reading text-base">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-2 text-xl font-semibold tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-12 border-b pb-2 text-lg font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-8 font-semibold">{children}</h3>,
          p: ({ children }) => <p className="mt-4">{children}</p>,
          ul: ({ children }) => <ul className="mt-4 list-disc space-y-1.5 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1.5 pl-6">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-2 border-brand pl-4 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ className, children }) => {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            return lang ? (
              <CodeBlock code={String(children).replace(/\n$/, "")} lang={lang} />
            ) : (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{children}</code>
            );
          },
          // Fenced blocks render through CodeBlock; the wrapping <pre> would double the frame.
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b py-2 pr-4 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border-b py-2 pr-4 align-top">{children}</td>,
          hr: () => <hr className="my-10" />,
        }}
      >
        {markdown}
      </Markdown>
      {sources.length > 0 && (
        <aside className="mt-12 border-t pt-6 text-sm">
          <p className="eyebrow">Sources</p>
          <ol className="mt-2 space-y-1">
            {sources.map((s) => (
              <li key={`${s.index}-${s.source}`} className="flex gap-2">
                <span className="num text-muted-foreground">[{s.index}]</span>
                <a
                  href={s.source}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-brand underline-offset-4 hover:underline"
                >
                  {s.title || s.source}
                </a>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </article>
  );
}
