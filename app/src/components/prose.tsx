import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Compact markdown for chat bubbles and short model text: no headings hierarchy, tight spacing. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <p className="mt-3 font-semibold first:mt-0">{children}</p>,
          h2: ({ children }) => <p className="mt-3 font-semibold first:mt-0">{children}</p>,
          h3: ({ children }) => <p className="mt-3 font-semibold first:mt-0">{children}</p>,
          p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
          ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {children}
            </a>
          ),
          code: ({ className: cls, children }) =>
            cls ? (
              <pre className="mt-2 overflow-x-auto rounded-md bg-background/60 p-2 font-mono text-xs">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">{children}</code>
            ),
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="mt-2 overflow-x-auto">
              <table className="text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b py-1 pr-3 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border-b py-1 pr-3 align-top">{children}</td>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
