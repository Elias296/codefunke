/**
 * Das kleine Projekt am Ende eines Kapitels: Beschreibung, Checkliste,
 * freier Editor, optionale automatische Prüfung und "In meinen Projekten speichern".
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Loader2, Save, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { itemKey } from "@shared/progress.ts";
import type { BlockCheck, Chapter, CodeCheck } from "../../content/types";
import { text } from "../../content/text";
import { Markdown } from "../../components/ui/Markdown";
import { askText } from "../../components/ui/dialog";
import { toast } from "../../stores/toasts";
import { BlocksWorkbench, type BlocksWorkbenchHandle } from "../blocks/BlocksWorkbench";
import { parseDsl } from "../blocks/dsl";
import { checkBlocksTask } from "../blocks/checks";
import type { SWorkspace } from "../blocks/blockSpecs";
import { CodeWorkbench, type WorkbenchHandle } from "../code/CodeWorkbench";
import { checkCodeTask, praise } from "../runners/python/checkCode";
import { python } from "../runners/python/pythonRunner";
import { useProgress } from "../progress/store";
import { saveProject } from "../projects/projects";
import { Feedback, type FeedbackState } from "./Feedback";
import { loadDraft, saveDraft } from "./drafts";
import { withTrailingNewline } from "./TaskView";

export function ProjectView({ chapter, nextHref, nextLabel }: { chapter: Chapter; nextHref: string; nextLabel: string }) {
  const project = chapter.project;
  const key = itemKey("project", chapter.stageId, chapter.id);
  const isBlocks = project.kind === "blocks";
  const language = project.language ?? "python";
  const blocksRef = useRef<BlocksWorkbenchHandle>(null);
  const codeRef = useRef<WorkbenchHandle>(null);
  const initialBlocks = useMemo<SWorkspace>(() => loadDraft<SWorkspace>(key) ?? parseDsl(text(project.starter) || "wenn_start"), [key, project.starter]);
  const initialCode = useMemo(() => loadDraft<string>(key) ?? withTrailingNewline(text(project.starter)), [key, project.starter]);
  const [ticked, setTicked] = useState<boolean[]>(() => project.requirements.map(() => false));
  const [fb, setFb] = useState<FeedbackState | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const complete = useProgress((s) => s.complete);
  const done = useProgress((s) => Boolean(s.data.completions[key]));
  const allTicked = ticked.every(Boolean);

  const currentCode = () => (isBlocks ? JSON.stringify(blocksRef.current?.getProgram() ?? initialBlocks) : codeRef.current?.getCode() ?? "");

  const finish = async () => {
    setBusy(true);
    setFb(null);
    try {
      if (project.checks?.length) {
        if (isBlocks) {
          const res = await checkBlocksTask(blocksRef.current!.getProgram(), project.checks as BlockCheck[], project.stage, project.run);
          if (!res.ok) return setFb({ ok: false, title: "Fast fertig!", message: res.message });
        } else {
          const res = await checkCodeTask(codeRef.current!.getCode(), project.checks as CodeCheck[], (c, g) => python.check(c, g));
          if (!res.ok) {
            if (res.line) codeRef.current?.markError(res.line, res.message);
            return setFb({ ok: false, title: res.title, message: res.message, expected: res.expected, actual: res.actual });
          }
        }
      }
      const r = complete(key, { xp: project.xp ?? 50 });
      setFb({ ok: true, title: `${praise()} Projekt geschafft!`, xpGained: r.xpGained, message: "Speichere dein Projekt, dann findest du es unter „Projekte“ wieder." });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const title = await askText("Wie soll dein Projekt heißen?", project.title);
    if (!title) return;
    try {
      const saved = await saveProject({ id: savedId ?? undefined, title, description: project.title, language: isBlocks ? "blocks" : language, code: currentCode() });
      setSavedId(saved.id);
      toast({ kind: "success", title: "Gespeichert!", text: saved.local ? "Dein Projekt ist auf diesem Gerät gespeichert." : "Du findest es unter „Projekte“." });
    } catch (e) {
      toast({ kind: "error", title: "Speichern hat nicht geklappt", text: (e as Error).message });
    }
  };

  const actions = (
    <>
      <button type="button" className="cf-btn cf-btn-primary" onClick={() => void finish()} disabled={busy || (!project.checks?.length && !allTicked)}
        title={!project.checks?.length && !allTicked ? "Hake zuerst alle Punkte der Checkliste ab" : undefined}>
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : project.checks?.length ? <ShieldCheck size={18} aria-hidden="true" /> : <Trophy size={18} aria-hidden="true" />}
        {project.checks?.length ? "Projekt prüfen" : "Projekt abschließen"}
      </button>
      <button type="button" className="cf-btn" onClick={() => void save()}>
        <Save size={18} aria-hidden="true" /> {savedId ? "Erneut speichern" : "Speichern"}
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="cf-card grid gap-5 p-5 lg:grid-cols-[1fr_minmax(260px,360px)]" aria-labelledby="projekt-titel">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="cf-pill bg-grape text-on-color"><Sparkles size={14} aria-hidden="true" /> Projekt</span>
            <span className="cf-pill text-xs">{project.xp ?? 50} XP</span>
            {done && <span className="cf-pill bg-success-bg text-success"><CheckCircle2 size={16} aria-hidden="true" /> Geschafft</span>}
          </div>
          <h2 id="projekt-titel" className="text-2xl font-bold">{project.title}</h2>
          <Markdown>{text(project.description)}</Markdown>
        </div>
        <div className="flex flex-col gap-3">
          <fieldset className="cf-card-flat bg-surface-2 p-4">
            <legend className="px-1 font-display font-bold">Checkliste</legend>
            <ul className="flex flex-col gap-2">
              {project.requirements.map((req, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-leaf)]" checked={ticked[i]}
                      onChange={(e) => setTicked(ticked.map((t, j) => (j === i ? e.target.checked : t)))} />
                    <span>{req}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {project.ideas && project.ideas.length > 0 && (
            <div className="cf-card-flat p-4">
              <p className="font-display font-bold">Noch mehr Ideen</p>
              <ul className="list-disc pl-5 text-sm">
                {project.ideas.map((idea, i) => <li key={i}>{idea}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      {fb && !isBlocks && <Feedback fb={fb} nextHref={nextHref} nextLabel={nextLabel} />}

      {isBlocks ? (
        <BlocksWorkbench ref={blocksRef} initial={initialBlocks} toolbox={project.toolbox} setup={project.stage}
          onChange={(ws) => saveDraft(key, ws)} actions={actions}
          aside={fb && <Feedback fb={fb} nextHref={nextHref} nextLabel={nextLabel} />} />
      ) : (
        <CodeWorkbench ref={codeRef} language={language} initialCode={initialCode} resetCode={withTrailingNewline(text(project.starter))}
          onChange={(c) => saveDraft(key, c)} actions={actions} editorClassName="h-[440px]" />
      )}

      {savedId && (
        <p className="text-sm">
          Gespeichert! <Link to="/projekte" className="font-bold underline">Zu deinen Projekten</Link>
        </p>
      )}
    </div>
  );
}
