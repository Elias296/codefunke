import { useCallback, useEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";

export type ConsoleStream = "stdout" | "stderr" | "stdin" | "info" | "success";

export interface ConsoleEntry {
  text: string;
  stream: ConsoleStream;
}

const MAX_CHARS = 120_000;

/** Ausgabe sammeln – gebündelt pro Bildschirm-Frame, damit viele print() die Seite nicht bremsen */
export function useConsole() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const buffer = useRef<ConsoleEntry[]>([]);
  const frame = useRef<number>(0);

  const flush = useCallback(() => {
    frame.current = 0;
    const add = buffer.current;
    buffer.current = [];
    setEntries((prev) => {
      const next = [...prev];
      for (const e of add) {
        const last = next[next.length - 1];
        if (last && last.stream === e.stream) next[next.length - 1] = { ...last, text: last.text + e.text };
        else next.push(e);
      }
      // Sehr lange Ausgaben vorne kürzen
      let total = next.reduce((n, e) => n + e.text.length, 0);
      while (total > MAX_CHARS && next.length > 1) total -= next.shift()!.text.length;
      if (total > MAX_CHARS) next[0] = { ...next[0], text: "…" + next[0].text.slice(total - MAX_CHARS) };
      return next;
    });
  }, []);

  const append = useCallback((text: string, stream: ConsoleStream = "stdout") => {
    buffer.current.push({ text, stream });
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  }, [flush]);

  const clear = useCallback(() => {
    buffer.current = [];
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    setEntries([]);
  }, []);

  return { entries, append, clear };
}

const streamClass: Record<ConsoleStream, string> = {
  stdout: "",
  stderr: "text-error",
  stdin: "font-bold text-sky",
  info: "italic text-muted",
  success: "font-bold text-success",
};

interface Props {
  entries: ConsoleEntry[];
  /** Wenn gesetzt, wartet das Programm auf eine Eingabe */
  waitingForInput?: string | null;
  onSubmitInput?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Die Ausgabe-Konsole. Bei input() erscheint ein Eingabefeld. */
export function OutputConsole({ entries, waitingForInput, onSubmitInput, placeholder = "Hier erscheint die Ausgabe deines Programms.", className = "" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, waitingForInput]);

  useEffect(() => {
    if (waitingForInput !== null && waitingForInput !== undefined) inputRef.current?.focus();
  }, [waitingForInput]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitInput?.(value);
    setValue("");
  };

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border-[2.5px] border-line bg-[#1d1b3a] text-[#f4f1ff] ${className}`}>
      <div className="flex items-center gap-2 border-b-2 border-white/10 px-3 py-1.5 font-display text-sm font-semibold text-white/80">
        <span className="h-2.5 w-2.5 rounded-full bg-berry" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-sun" aria-hidden="true" />
        <span className="h-2.5 w-2.5 rounded-full bg-leaf" aria-hidden="true" />
        <span className="ml-1">Ausgabe</span>
      </div>
      <div ref={scrollRef} className="min-h-[7rem] flex-1 overflow-auto px-3 py-2 font-mono text-[0.92rem] leading-relaxed [--color-sky:#8cb8ff] [--cf-error:#ff9aa2] [--cf-success:#7ee29a] [--cf-muted:#b9b4dc]"
        role="log" aria-live="polite" aria-label="Ausgabe des Programms">
        {entries.length === 0 && !waitingForInput && <p className="italic text-white/50">{placeholder}</p>}
        <pre className="whitespace-pre-wrap break-words font-mono">
          {entries.map((e, i) => <span key={i} className={streamClass[e.stream]}>{e.text}</span>)}
        </pre>
        {waitingForInput !== null && waitingForInput !== undefined && (
          <form onSubmit={submit} className="mt-1 flex items-center gap-2">
            <label htmlFor="cf-console-input" className="sr-only">Eingabe für dein Programm{waitingForInput ? `: ${waitingForInput}` : ""}</label>
            <span aria-hidden="true" className="text-sun">›</span>
            <input id="cf-console-input" ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border-2 border-sun bg-white/10 px-2 py-1 font-mono text-white outline-none focus:bg-white/15" />
            <button type="submit" className="cf-btn cf-btn-sun cf-btn-sm" aria-label="Eingabe absenden">
              <CornerDownLeft size={16} aria-hidden="true" /> Enter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
