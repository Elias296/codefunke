/**
 * Statischer Code mit Syntax-Hervorhebung (gleiche Farben wie im Editor),
 * optional mit "Ausprobieren"-Knopf, der den Code im Editor öffnet.
 */
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import { pythonLanguage } from "@codemirror/lang-python";
import { javascriptLanguage } from "@codemirror/lang-javascript";
import { htmlLanguage } from "@codemirror/lang-html";
import { cssLanguage } from "@codemirror/lang-css";
import { javaLanguage } from "@codemirror/lang-java";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { Play } from "lucide-react";

const luaLanguage = StreamLanguage.define(lua);

const PARSERS: Record<string, { parse: (s: string) => import("@lezer/common").Tree }> = {
  python: pythonLanguage.parser,
  py: pythonLanguage.parser,
  javascript: javascriptLanguage.parser,
  js: javascriptLanguage.parser,
  html: htmlLanguage.parser,
  css: cssLanguage.parser,
  java: javaLanguage.parser,
  lua: luaLanguage.parser,
};

export function highlight(code: string, lang: string): ReactNode[] {
  const parser = PARSERS[lang];
  if (!parser) return [code];
  const out: ReactNode[] = [];
  let i = 0;
  highlightCode(code, parser.parse(code), classHighlighter,
    (text, classes) => { out.push(classes ? <span key={i++} className={classes}>{text}</span> : text); },
    () => { out.push("\n"); });
  return out;
}

/** Sprache aus dem Code-Block → Sprache im Editor */
const EDITOR_LANG: Record<string, string> = { python: "python", py: "python", lua: "lua", java: "java" };

export function CodeBlock({ code, lang, tryIt = false, className = "" }: { code: string; lang: string; tryIt?: boolean; className?: string }) {
  const nodes = useMemo(() => highlight(code, lang), [code, lang]);
  const editorLang = EDITOR_LANG[lang];
  return (
    <div className={`cf-code relative ${className}`}>
      <pre className="overflow-x-auto p-4 pr-4 text-[0.92rem]"><code>{nodes}</code></pre>
      {tryIt && editorLang && (
        <Link to={`/editor/${editorLang}?code=${encodeURIComponent(code)}`} className="cf-btn cf-btn-sm cf-btn-sun absolute bottom-2 right-2"
          aria-label="Diesen Code im Editor ausprobieren">
          <Play size={14} fill="currentColor" aria-hidden="true" /> Ausprobieren
        </Link>
      )}
    </div>
  );
}
