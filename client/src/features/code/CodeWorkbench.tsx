/**
 * Arbeitsfläche für Text-Code: Editor + Ausführen/Stopp + Ausgabe.
 * - Python: Konsole mit input(), Turtle-Zeichenfläche, freundliche Fehler.
 * - Web: Tabs für HTML/CSS/JS und Live-Vorschau.
 * - Lua: Konsole.  - Java: Platzhalter (Stufe 6).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Play, Square, RotateCcw, Loader2 } from "lucide-react";
import { CodeEditor, type CodeEditorHandle, type EditorLanguage } from "./CodeEditor";
import { OutputConsole, useConsole } from "./OutputConsole";
import { TurtleCanvas, type TurtleHandle } from "./TurtleCanvas";
import { python } from "../runners/python/pythonRunner";
import { explainError } from "../runners/python/errorHelp";
import { luaRunner } from "../runners/lua/luaRunner";
import { runJava } from "../runners/java/javaRunner";
import { WebPreview } from "../runners/web/WebPreview";
import { buildDocument, parseWebProject, type WebFiles } from "../runners/web/buildDocument";
import { useProgress } from "../progress/store";

export type CodeLanguage = "python" | "web" | "lua" | "java";

export interface WorkbenchHandle {
  getCode: () => string;
  setCode: (code: string) => void;
  markError: (line: number | null, message?: string) => void;
  /** Schreibt eine Nachricht in die Konsole */
  say: (text: string, kind?: "info" | "success" | "stderr") => void;
}

interface Props {
  language: CodeLanguage;
  initialCode: string;
  onChange?: (code: string) => void;
  /** Zusätzliche Knöpfe neben "Ausführen" (z. B. Prüfen, Speichern) */
  actions?: React.ReactNode;
  /** Höhe des Editors */
  editorClassName?: string;
  /** Bei "Zurücksetzen" wird dieser Code geladen */
  resetCode?: string;
}

function usePythonStatus() {
  const [status, setStatus] = useState(python.status);
  useEffect(() => python.onStatus(setStatus), []);
  return status;
}

export const CodeWorkbench = forwardRef<WorkbenchHandle, Props>(function CodeWorkbench(
  { language, initialCode, onChange, actions, editorClassName = "h-[380px]", resetCode },
  ref,
) {
  const editorRef = useRef<CodeEditorHandle>(null);
  const turtleRef = useRef<TurtleHandle>(null);
  const [code, setCodeState] = useState(initialCode);
  const codeRef = useRef(initialCode);
  const { entries, append, clear } = useConsole();
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [showTurtle, setShowTurtle] = useState(() => /import\s+turtle|from\s+turtle/.test(initialCode));
  const [stdinText, setStdinText] = useState("");
  const [webTab, setWebTab] = useState<keyof WebFiles>("html");
  const [previewHtml, setPreviewHtml] = useState(() => (language === "web" ? buildDocument(parseWebProject(initialCode)) : ""));
  const pyStatus = usePythonStatus();
  const lastRunHadError = useRef(false);
  const bumpStat = useProgress((s) => s.bumpStat);

  // Python früh laden, damit "Ausführen" schnell reagiert
  useEffect(() => {
    if (language === "python") void python.ensure().catch(() => undefined);
  }, [language]);

  const setCode = useCallback((c: string) => {
    codeRef.current = c;
    setCodeState(c);
    onChange?.(c);
  }, [onChange]);

  // --------------------------------------------------------------- Web
  const webFiles = useMemo(() => (language === "web" ? parseWebProject(code) : null), [language, code]);
  useEffect(() => {
    if (language !== "web" || !webFiles) return;
    const t = window.setTimeout(() => setPreviewHtml(buildDocument(webFiles)), 600);
    return () => window.clearTimeout(t);
  }, [language, webFiles]);

  const setWebFile = (file: keyof WebFiles, value: string) => {
    const files = { ...parseWebProject(codeRef.current), [file]: value };
    setCode(JSON.stringify(files));
  };

  // ------------------------------------------------------------- Ausführen
  const run = useCallback(async () => {
    const src = codeRef.current;
    editorRef.current?.markError(null);
    bumpStat("codeRuns");
    if (language === "web") {
      clear();
      setPreviewHtml(buildDocument(parseWebProject(src)) + `<!-- ${Date.now()} -->`);
      return;
    }
    clear();
    setRunning(true);
    setWaiting(null);
    const inputs = stdinText ? stdinText.split("\n") : [];

    if (language === "python") {
      if (/import\s+turtle|from\s+turtle/.test(src)) setShowTurtle(true);
      turtleRef.current?.reset();
      if (python.status === "loading" || python.status === "idle") append("Python wird geladen …\n", "info");
      const result = await python.run(src, {
        output: (text, stream) => append(text, stream === "stdin" ? "stdin" : stream),
        inputRequest: (prompt) => setWaiting(prompt),
        inputMissing: () => append("\n[Dein Programm möchte eine Eingabe. Trag sie unten im Feld „Eingaben“ ein (eine pro Zeile) und starte nochmal.]\n", "info"),
        turtle: (cmds) => { setShowTurtle(true); turtleRef.current?.push(cmds); },
      }, python.interactive ? undefined : inputs);
      setWaiting(null);
      setRunning(false);
      if (result.error) {
        if (result.error.type === "KeyboardInterrupt") {
          append("\n■ Programm gestoppt.\n", "info");
          return;
        }
        const f = explainError(result.error);
        append(`\n${f.title} ${f.text.replace(/`/g, "")}\n`, "stderr");
        append(`(${f.original})\n`, "info");
        editorRef.current?.markError(f.line ?? null, `${f.title} ${f.text.replace(/`/g, "")}`);
        lastRunHadError.current = true;
      } else {
        if (lastRunHadError.current) bumpStat("errorsFixed");
        lastRunHadError.current = false;
        append("\n✓ Programm beendet.\n", "success");
      }
      return;
    }

    if (language === "lua") {
      const result = await luaRunner.run(src, {
        output: (text, stream) => append(text, stream === "stdin" ? "stdin" : "stdout"),
        inputRequest: () => setWaiting(""),
      }, luaRunner.interactive ? undefined : inputs);
      setWaiting(null);
      setRunning(false);
      if (result.stopped) append("\n■ Programm gestoppt.\n", "info");
      else if (!result.ok) {
        append(`\nHoppla! ${result.error?.replace(/`/g, "")}\n`, "stderr");
        editorRef.current?.markError(result.line ?? null, result.error);
      } else append("\n✓ Programm beendet.\n", "success");
      return;
    }

    if (language === "java") {
      const result = await runJava(src);
      setRunning(false);
      append(result.output, "stdout");
      if (result.error) append(result.error + "\n", "info");
    }
  }, [language, append, clear, stdinText, bumpStat]);

  const stop = () => {
    if (language === "python") python.stop();
    if (language === "lua") luaRunner.stop();
  };

  const submitInput = (value: string) => {
    append(`${value}\n`, "stdin");
    setWaiting(null);
    if (language === "python") python.provideInput(value);
    if (language === "lua") luaRunner.provideInput(value);
  };

  useImperativeHandle(ref, () => ({
    getCode: () => codeRef.current,
    setCode: (c) => {
      setCode(c);
      if (language === "web") setPreviewHtml(buildDocument(parseWebProject(c)));
      else editorRef.current?.setValue(c);
    },
    markError: (line, message) => editorRef.current?.markError(line, message),
    say: (text, kind = "info") => append(`${text}\n`, kind),
  }), [language, setCode, append]);

  const editorLang: EditorLanguage = language === "web" ? (webTab === "js" ? "javascript" : webTab) : language;
  const needsStdinBox = !running && ((language === "python" && !python.interactive && pyStatus === "ready") || (language === "lua" && !luaRunner.interactive)) && /input\(|io\.read/.test(code);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {language === "web" ? (
          <button type="button" onClick={() => void run()} className="cf-btn cf-btn-go">
            <RotateCcw size={18} aria-hidden="true" /> Vorschau neu laden
          </button>
        ) : running ? (
          <button type="button" onClick={stop} className="cf-btn cf-btn-danger">
            <Square size={16} fill="currentColor" aria-hidden="true" /> Stopp
          </button>
        ) : (
          <button type="button" onClick={() => void run()} className="cf-btn cf-btn-go" title="Ausführen (Strg+Enter)">
            {language === "python" && pyStatus === "loading" ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
            Ausführen
          </button>
        )}
        {actions}
        {resetCode !== undefined && (
          <button type="button" className="cf-btn cf-btn-ghost cf-btn-sm ml-auto" onClick={() => {
            if (window.confirm("Deinen Code wirklich auf den Anfang zurücksetzen?")) {
              setCode(resetCode);
              if (language !== "web") editorRef.current?.setValue(resetCode);
            }
          }}>
            <RotateCcw size={16} aria-hidden="true" /> Zurücksetzen
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${language === "web" || showTurtle ? "lg:grid-cols-2" : ""}`}>
        <div className="flex min-w-0 flex-col gap-2">
          {language === "web" && (
            <div role="tablist" aria-label="Dateien" className="flex gap-1">
              {(["html", "css", "js"] as const).map((tab) => (
                <button key={tab} role="tab" type="button" aria-selected={webTab === tab} onClick={() => setWebTab(tab)}
                  className={`rounded-t-xl border-2 border-b-0 px-3 py-1 font-mono text-sm font-bold ${webTab === tab ? "border-line bg-code" : "border-transparent text-muted hover:bg-surface-2"}`}>
                  {tab === "html" ? "index.html" : tab === "css" ? "style.css" : "script.js"}
                </button>
              ))}
            </div>
          )}
          <div className={`overflow-hidden rounded-2xl border-[2.5px] border-line shadow-[4px_4px_0_var(--cf-shadow)] ${editorClassName}`}>
            {language === "web" && webFiles ? (
              <CodeEditor key={webTab} language={editorLang} value={webFiles[webTab]} onChange={(v) => setWebFile(webTab, v)}
                label={`Code-Editor für ${webTab.toUpperCase()}`} />
            ) : (
              <CodeEditor ref={editorRef} language={editorLang} value={code} onChange={setCode} onRun={() => void run()}
                label={`Code-Editor (${language === "python" ? "Python" : language === "lua" ? "Lua" : "Java"}). Strg+Enter führt aus. Escape und dann Tab verlässt den Editor.`} />
            )}
          </div>
          {needsStdinBox && (
            <label className="block text-sm">
              <span className="cf-label">Eingaben (eine pro Zeile)</span>
              <textarea value={stdinText} onChange={(e) => setStdinText(e.target.value)} rows={2} className="cf-input font-mono text-sm"
                placeholder="z. B. Ada" />
              <span className="text-muted">Dein Browser unterstützt keine Live-Eingaben – trag sie hier vorab ein.</span>
            </label>
          )}
        </div>

        {language === "web" ? (
          <div className="flex min-h-[320px] flex-col gap-2">
            <WebPreview html={previewHtml} className="min-h-[320px] flex-1"
              onConsole={(level, text) => append(`${text}\n`, level === "error" ? "stderr" : "stdout")} />
          </div>
        ) : language === "python" ? (
          // Immer eingebunden (nur versteckt), damit keine Turtle-Befehle verloren gehen
          <TurtleCanvas ref={turtleRef} className={showTurtle ? "self-start" : "hidden"} />
        ) : null}
      </div>

      <OutputConsole entries={entries} waitingForInput={waiting} onSubmitInput={submitInput} className="max-h-72"
        placeholder={language === "web" ? "Ausgaben von console.log() erscheinen hier." : "Klicke auf „Ausführen“ – hier erscheint dann die Ausgabe."} />
    </div>
  );
});
