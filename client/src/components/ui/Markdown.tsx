/**
 * Markdown für Lektionen und Aufgaben. Besondere Code-Blöcke:
 *   ```python        → hervorgehobener Code mit "Ausprobieren"-Knopf
 *   ```blocks        → Block-Programm (Block-Schreibweise) als echte Blöcke
 *   ```blocks-python → Blöcke und Python nebeneinander (für den Übergang)
 *   ```output        → So sieht die Ausgabe aus
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { lazy, Suspense } from "react";
import { CodeBlock } from "./CodeBlock";

const BlocksPreview = lazy(() => import("../../features/blocks/BlocksPreview").then((m) => ({ default: m.BlocksPreview })));
const BlocksWithPython = lazy(() => import("../../features/blocks/BlocksWithPython"));

function Fallback() {
  return <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-hidden="true" />;
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`cf-prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children: c }) => <>{c}</>,
          code: ({ className: cls, children: c }) => {
            const lang = /language-([\w-]+)/.exec(cls ?? "")?.[1];
            const src = String(c ?? "").replace(/\n$/, "");
            if (!lang && !src.includes("\n")) return <code>{c}</code>;
            if (lang === "blocks") return <Suspense fallback={<Fallback />}><BlocksPreview source={src} /></Suspense>;
            if (lang === "blocks-python") return <Suspense fallback={<Fallback />}><BlocksWithPython source={src} /></Suspense>;
            if (lang === "output") {
              return (
                <div className="overflow-hidden rounded-xl border-2 border-line bg-[#1d1b3a] text-[#f4f1ff]">
                  <div className="border-b border-white/10 px-3 py-1 font-display text-xs font-semibold text-white/70">Ausgabe</div>
                  <pre className="overflow-x-auto px-3 py-2 font-mono text-[0.9rem]">{src}</pre>
                </div>
              );
            }
            return <CodeBlock code={src} lang={lang ?? "text"} tryIt />;
          },
          a: ({ href, children: c }) => {
            const external = href?.startsWith("http");
            return <a href={href} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>{c}</a>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
