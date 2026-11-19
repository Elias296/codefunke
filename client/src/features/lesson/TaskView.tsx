/**
 * Eine Aufgabe im Kapitel – Block-Aufgabe oder Code-Aufgabe.
 */
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { itemKey } from "@shared/progress.ts";
import type { BlocksTask, Chapter, CodeTask, Task } from "../../content/types";
import { text } from "../../content/text";
import { Markdown } from "../../components/ui/Markdown";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { BlocksWorkbench, type BlocksWorkbenchHandle } from "../blocks/BlocksWorkbench";
import { BlocksPreview } from "../blocks/BlocksPreview";
import { parseDsl } from "../blocks/dsl";
import { checkBlocksTask } from "../blocks/checks";
import type { SWorkspace } from "../blocks/blockSpecs";
import { CodeWorkbench, type WorkbenchHandle } from "../code/CodeWorkbench";
import { checkCodeTask, praise } from "../runners/python/checkCode";
import { python } from "../runners/python/pythonRunner";
import { useProgress } from "../progress/store";
import { HintPanel, hintLevel } from "./HintPanel";
import { Difficulty, Feedback, type FeedbackState } from "./Feedback";
import { loadDraft, saveDraft } from "./drafts";

interface Props {
  task: Task;
  chapter: Chapter;
  index: number;
  nextHref: string;
  nextLabel: string;
}

export function TaskView(props: Props) {
  return props.task.kind === "blocks" ? <BlocksTaskView {...props} task={props.task} /> : <CodeTaskView {...props} task={props.task} />;
}

function TaskHeader({ task, index, done, children }: { task: Task; index: number; done: boolean; children: React.ReactNode }) {
  return (
    <section className="cf-card flex flex-col gap-3 p-5" aria-labelledby="aufgabe-titel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="cf-pill bg-sun text-on-color">Aufgabe {index + 1}</span>
        <Difficulty level={task.difficulty} />
        <span className="cf-pill text-xs">{task.xp} XP</span>
        {done && (
          <span className="cf-pill bg-success-bg text-success"><CheckCircle2 size={16} aria-hidden="true" /> Geschafft</span>
        )}
      </div>
      <h2 id="aufgabe-titel" className="text-2xl font-bold">{task.title}</h2>
      <Markdown>{text(task.instructions)}</Markdown>
      {children}
    </section>
  );
}

export function withTrailingNewline(code: string): string {
  return code && !code.endsWith("\n") ? `${code}\n` : code;
}

/** XP und Hilfe-Infos für einen Abschluss berechnen */
function completionFor(key: string, xp: number) {
  const hints = hintLevel(key);
  const usedSolution = hints >= 3;
  return { xp: usedSolution ? Math.ceil(xp / 2) : xp, hintsUsed: hints || undefined, usedSolution: usedSolution || undefined };
}

function BlocksTaskView({ task, chapter, index, nextHref, nextLabel }: Props & { task: BlocksTask }) {
  const key = itemKey("task", chapter.stageId, chapter.id, task.id);
  const initial = useMemo<SWorkspace>(() => loadDraft<SWorkspace>(key) ?? parseDsl(text(task.starter) || "wenn_start"), [key, task.starter]);
  const wbRef = useRef<BlocksWorkbenchHandle>(null);
  const [fb, setFb] = useState<FeedbackState | null>(null);
  const [checking, setChecking] = useState(false);
  const failed = useRef(false);
  const complete = useProgress((s) => s.complete);
  const bumpStat = useProgress((s) => s.bumpStat);
  const done = useProgress((s) => Boolean(s.data.completions[key]));

  const check = async () => {
    setChecking(true);
    setFb(null);
    try {
      const res = await checkBlocksTask(wbRef.current!.getProgram(), task.checks, task.stage, task.run);
      if (res.ok) {
        const r = complete(key, completionFor(key, task.xp ?? 10));
        if (failed.current) bumpStat("errorsFixed");
        failed.current = false;
        setFb({ ok: true, title: task.success ?? praise(), xpGained: r.xpGained, message: r.isNew ? undefined : "Die hattest du schon – aber doppelt hält besser!" });
      } else {
        failed.current = true;
        setFb({ ok: false, title: "Noch nicht ganz", message: res.message });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <TaskHeader task={task} index={index} done={done}>
        <HintPanel progressKey={key} hints={task.hints} renderSolution={() => (
          <div className="flex flex-col gap-2">
            <BlocksPreview source={text(task.solution)} />
            <button type="button" className="cf-btn cf-btn-sm self-start" onClick={() => wbRef.current?.load(parseDsl(text(task.solution)))}>
              Lösung übernehmen
            </button>
          </div>
        )} />
      </TaskHeader>
      <BlocksWorkbench ref={wbRef} initial={initial} toolbox={task.toolbox} setup={task.stage} showPython={task.showPython}
        onChange={(ws) => saveDraft(key, ws)}
        actions={
          <button type="button" onClick={() => void check()} disabled={checking} className="cf-btn cf-btn-primary">
            {checking ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />} Prüfen
          </button>
        }
        aside={fb && <Feedback fb={fb} nextHref={nextHref} nextLabel={nextLabel} />}
      />
    </div>
  );
}

function CodeTaskView({ task, chapter, index, nextHref, nextLabel }: Props & { task: CodeTask }) {
  const key = itemKey("task", chapter.stageId, chapter.id, task.id);
  // Startcode endet immer mit einer Leerzeile – dort kann man direkt weiterschreiben
  const starter = useMemo(() => withTrailingNewline(text(task.starter)), [task.starter]);
  const initial = useMemo(() => loadDraft<string>(key) ?? starter, [key, starter]);
  const wbRef = useRef<WorkbenchHandle>(null);
  const [fb, setFb] = useState<FeedbackState | null>(null);
  const [checking, setChecking] = useState(false);
  const failed = useRef(false);
  const complete = useProgress((s) => s.complete);
  const bumpStat = useProgress((s) => s.bumpStat);
  const done = useProgress((s) => Boolean(s.data.completions[key]));

  const check = async () => {
    setChecking(true);
    setFb(null);
    try {
      if (task.language !== "python") {
        setFb({ ok: false, title: "Bald verfügbar", message: "Die automatische Prüfung für diese Sprache kommt bald." });
        return;
      }
      const code = wbRef.current!.getCode();
      const res = await checkCodeTask(code, task.checks, (c, g) => python.check(c, g));
      if (res.ok) {
        const r = complete(key, completionFor(key, task.xp ?? 10));
        if (failed.current) bumpStat("errorsFixed");
        failed.current = false;
        wbRef.current?.markError(null);
        setFb({ ok: true, title: task.success ?? res.title, xpGained: r.xpGained, message: r.isNew ? undefined : "Die hattest du schon – aber doppelt hält besser!" });
      } else {
        failed.current = true;
        if (res.line) wbRef.current?.markError(res.line, `${res.title} ${res.message}`.replace(/`/g, ""));
        setFb({ ok: false, title: res.title, message: res.message, expected: res.expected, actual: res.actual });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <TaskHeader task={task} index={index} done={done}>
        <HintPanel progressKey={key} hints={task.hints} renderSolution={() => (
          <div className="flex flex-col gap-2">
            <CodeBlock code={text(task.solution)} lang={task.language} />
            <button type="button" className="cf-btn cf-btn-sm self-start" onClick={() => wbRef.current?.setCode(text(task.solution))}>
              Lösung einfügen
            </button>
          </div>
        )} />
      </TaskHeader>
      {fb && <Feedback fb={fb} nextHref={nextHref} nextLabel={nextLabel} />}
      <CodeWorkbench ref={wbRef} language={task.language} initialCode={initial} resetCode={starter}
        onChange={(c) => saveDraft(key, c)}
        actions={
          <button type="button" onClick={() => void check()} disabled={checking} className="cf-btn cf-btn-primary">
            {checking ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />} Prüfen
          </button>
        }
      />
    </div>
  );
}
