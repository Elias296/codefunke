/**
 * Quiz – eine Frage nach der anderen, mit sofortiger Rückmeldung.
 * Fragetypen: Einfachauswahl, Mehrfachauswahl, Text eingeben, Zeilen ordnen.
 * Wird für das Kapitel-Quiz und den Abschlusstest einer Stufe verwendet.
 */
import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, RotateCcw, X } from "lucide-react";
import type { Question } from "../../content/types";
import { text } from "../../content/text";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { Markdown } from "../../components/ui/Markdown";
import { ProgressBar } from "../../components/ui/ProgressRing";
import { BlocksPreview } from "../blocks/BlocksPreview";
import { Funki } from "../../components/mascot/Funki";

type Answer = number | number[] | string | string[] | null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initialAnswer(q: Question): Answer {
  if (q.type === "multiple") return [];
  if (q.type === "text") return "";
  if (q.type === "order") {
    let s = shuffle(q.lines);
    for (let i = 0; i < 5 && s.join("\n") === q.lines.join("\n"); i++) s = shuffle(q.lines);
    return s;
  }
  return null;
}

function normalize(s: string, caseSensitive?: boolean): string {
  const t = s.trim().replace(/\s+/g, " ");
  return caseSensitive ? t : t.toLowerCase();
}

/** Ist die Antwort richtig? (exportiert für Tests) */
export function isCorrect(q: Question, a: Answer): boolean {
  switch (q.type) {
    case "single": return a === q.answer;
    case "multiple": {
      const given = [...((a as number[]) ?? [])].sort();
      const want = [...q.answer].sort();
      return given.length === want.length && given.every((v, i) => v === want[i]);
    }
    case "text": return q.answer.some((ans) => normalize(String(a ?? ""), q.caseSensitive) === normalize(ans, q.caseSensitive));
    case "order": return JSON.stringify(a) === JSON.stringify(q.lines);
  }
}

function canSubmit(q: Question, a: Answer): boolean {
  if (q.type === "single") return a !== null;
  if (q.type === "multiple") return (a as number[]).length > 0;
  if (q.type === "text") return String(a).trim().length > 0;
  return true;
}

interface Props {
  questions: Question[];
  /** Anteil richtiger Antworten zum Bestehen (0..1) */
  passScore: number;
  /** Wird am Ende aufgerufen; Rückgabe = verdiente XP (zur Anzeige) */
  onFinish: (score: number, correct: number) => number | void;
  /** Zusätzlicher Inhalt auf dem Ergebnis-Bildschirm */
  resultExtra?: (passed: boolean) => React.ReactNode;
  label?: string;
}

export function QuizView({ questions, passScore, onFinish, resultExtra, label = "Quiz" }: Props) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(initialAnswer));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ score: number; xp: number } | null>(null);
  const q = questions[index];
  const a = answers[index];
  const right = useMemo(() => (checked ? isCorrect(q, a) : false), [checked, q, a]);

  const setAnswer = (v: Answer) => setAnswers((prev) => prev.map((x, i) => (i === index ? v : x)));

  const submit = () => {
    if (!canSubmit(q, a)) return;
    setChecked(true);
    if (isCorrect(q, a)) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setChecked(false);
      return;
    }
    const score = correct / questions.length;
    const xp = onFinish(score, correct) ?? 0;
    setResult({ score, xp });
  };

  const restart = () => {
    setRound(round + 1);
    setIndex(0);
    setAnswers(questions.map(initialAnswer));
    setChecked(false);
    setCorrect(0);
    setResult(null);
  };

  if (result) {
    const passed = result.score >= passScore;
    return (
      <div className="cf-card flex flex-col items-center gap-4 p-8 text-center animate-pop" role="status">
        <Funki mood={passed ? "cheer" : "think"} size={150} />
        <h2 className="text-3xl font-bold">{result.score === 1 ? "Alles richtig!" : passed ? "Bestanden!" : "Fast geschafft!"}</h2>
        <p className="text-lg">
          Du hast <strong>{correct} von {questions.length}</strong> Fragen richtig beantwortet.
          {!passed && ` Zum Bestehen brauchst du ${Math.ceil(passScore * questions.length)}. Schau dir die Erklärung nochmal an und versuch es erneut!`}
        </p>
        {result.xp > 0 && <p className="cf-pill bg-sun px-3 py-1 text-base text-on-color">+{result.xp} XP</p>}
        {resultExtra?.(passed)}
        <button type="button" onClick={restart} className="cf-btn">
          <RotateCcw size={18} aria-hidden="true" /> Nochmal versuchen
        </button>
      </div>
    );
  }

  return (
    <section className="cf-card flex flex-col gap-4 p-5 sm:p-7" aria-label={label} key={round}>
      <div className="flex items-center gap-3">
        <span className="font-display font-semibold">Frage {index + 1} von {questions.length}</span>
        <div className="flex-1"><ProgressBar value={index / questions.length} label="Fortschritt im Quiz" height={12} color="var(--color-grape)" /></div>
      </div>
      <h2 className="text-xl font-bold sm:text-2xl" id="quiz-frage">{q.question}</h2>
      {q.code && <CodeBlock code={text(q.code)} lang={q.codeLanguage ?? "python"} />}
      {q.blocks && <BlocksPreview source={text(q.blocks)} />}

      {q.type === "single" && (
        <div role="radiogroup" aria-labelledby="quiz-frage" className="grid gap-2">
          {q.options.map((opt, i) => (
            <OptionButton key={i} selected={a === i} disabled={checked} onClick={() => setAnswer(i)} role="radio"
              state={checked ? (i === q.answer ? "right" : a === i ? "wrong" : undefined) : undefined}>
              {opt}
            </OptionButton>
          ))}
        </div>
      )}

      {q.type === "multiple" && (
        <div role="group" aria-labelledby="quiz-frage" className="grid gap-2">
          <p className="text-sm text-muted">Mehrere Antworten können richtig sein.</p>
          {q.options.map((opt, i) => {
            const sel = (a as number[]).includes(i);
            return (
              <OptionButton key={i} selected={sel} disabled={checked} role="checkbox"
                onClick={() => setAnswer(sel ? (a as number[]).filter((x) => x !== i) : [...(a as number[]), i])}
                state={checked ? (q.answer.includes(i) ? "right" : sel ? "wrong" : undefined) : undefined}>
                {opt}
              </OptionButton>
            );
          })}
        </div>
      )}

      {q.type === "text" && (
        <form onSubmit={(e) => { e.preventDefault(); if (!checked) submit(); }}>
          <label htmlFor="quiz-text" className="sr-only">Deine Antwort</label>
          <input id="quiz-text" className="cf-input max-w-md font-mono" value={String(a)} disabled={checked} autoComplete="off"
            placeholder={q.placeholder ?? "Deine Antwort"} onChange={(e) => setAnswer(e.target.value)} />
          {checked && !right && <p className="mt-2">Richtig wäre: <code className="font-mono font-bold">{q.answer[0]}</code></p>}
        </form>
      )}

      {q.type === "order" && (
        <OrderQuestion lines={a as string[]} disabled={checked} onChange={setAnswer} correct={checked ? q.lines : undefined} />
      )}

      {checked && (
        <div className={`cf-card-flat animate-slide-up p-4 ${right ? "bg-success-bg" : "bg-error-bg"}`} role="status">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            {right ? <><Check aria-hidden="true" /> Richtig!</> : <><X aria-hidden="true" /> Leider nicht.</>}
          </p>
          {q.explanation && <Markdown className="!text-base">{q.explanation}</Markdown>}
        </div>
      )}

      <div className="flex justify-end">
        {!checked ? (
          <button type="button" className="cf-btn cf-btn-primary" onClick={submit} disabled={!canSubmit(q, a)}>
            Antwort prüfen
          </button>
        ) : (
          <button type="button" className="cf-btn cf-btn-primary" onClick={next} autoFocus>
            {index + 1 < questions.length ? "Nächste Frage" : "Ergebnis ansehen"} <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

function OptionButton({ children, selected, disabled, onClick, state, role }: {
  children: React.ReactNode; selected: boolean; disabled: boolean; onClick: () => void; state?: "right" | "wrong"; role: "radio" | "checkbox";
}) {
  const color = state === "right" ? "bg-success-bg border-success" : state === "wrong" ? "bg-error-bg border-error" : selected ? "bg-sun/40" : "bg-surface hover:bg-surface-2";
  return (
    <button type="button" role={role} aria-checked={selected} disabled={disabled} onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border-[2.5px] border-line px-4 py-3 text-left font-semibold transition-colors disabled:cursor-default ${color}`}>
      <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center border-2 border-line ${role === "radio" ? "rounded-full" : "rounded-md"} ${selected ? "bg-ink text-bg" : "bg-surface"}`}>
        {selected && <Check size={14} strokeWidth={3.5} />}
      </span>
      <span className="flex-1">{children}</span>
      {state === "right" && <Check className="text-success" aria-label="richtig" />}
      {state === "wrong" && <X className="text-error" aria-label="falsch" />}
    </button>
  );
}

/** Zeilen in die richtige Reihenfolge bringen – mit Pfeil-Knöpfen (auch per Tastatur bedienbar) */
function OrderQuestion({ lines, disabled, onChange, correct }: { lines: string[]; disabled: boolean; onChange: (l: string[]) => void; correct?: string[] }) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-2" aria-label="Zeilen zum Sortieren">
      {lines.map((line, i) => {
        const state = correct ? (correct[i] === line ? "border-success bg-success-bg" : "border-error bg-error-bg") : "bg-code";
        return (
          <li key={i} className={`flex items-center gap-2 rounded-xl border-[2.5px] border-line px-3 py-2 ${state}`}>
            <span className="w-5 text-center font-display font-bold text-muted">{i + 1}</span>
            <code className="flex-1 whitespace-pre font-mono text-[0.92rem]">{line}</code>
            <button type="button" className="cf-btn cf-btn-sm !min-h-8 !px-2" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`„${line.trim()}“ nach oben schieben`}>
              <ArrowUp size={16} aria-hidden="true" />
            </button>
            <button type="button" className="cf-btn cf-btn-sm !min-h-8 !px-2" disabled={disabled || i === lines.length - 1} onClick={() => move(i, 1)} aria-label={`„${line.trim()}“ nach unten schieben`}>
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
