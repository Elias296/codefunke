import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, Check } from "lucide-react";
import { itemKey } from "@shared/progress.ts";
import { getChapter, getStage, stages } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { chapterPath, chapterSteps, isStageUnlocked, type StepId } from "../features/progress/unlock";
import { Markdown } from "../components/ui/Markdown";
import { Icon } from "../components/ui/Icon";
import { FunkiSays } from "../components/mascot/Funki";
import { TaskView } from "../features/lesson/TaskView";
import { QuizView } from "../features/lesson/QuizView";
import { ProjectView } from "../features/lesson/ProjectView";
import { NotFoundPage } from "./NotFoundPage";

const QUIZ_PASS = 0.6;

/** Ein Kapitel: Erklärung → Aufgaben → Quiz → Projekt */
export default function ChapterPage() {
  const { stageId, chapterId, step = "lernen" } = useParams();
  const stage = getStage(stageId);
  const chapter = getChapter(stageId, chapterId);
  const progress = useProgress((s) => s.data);
  const complete = useProgress((s) => s.complete);
  const setLastVisited = useProgress((s) => s.setLastVisited);

  const steps = chapter ? chapterSteps(chapter) : [];
  const index = steps.findIndex((s) => s.id === step);
  const current = steps[index];

  useEffect(() => {
    if (chapter && current) setLastVisited(chapterPath(chapter, current.id), `${chapter.title} – ${current.label}`);
  }, [chapter, current, setLastVisited]);

  if (!stage || !chapter) return <NotFoundPage />;
  if (!current) return <Navigate to={chapterPath(chapter)} replace />;
  if (!isStageUnlocked(stage, stages, progress)) return <Navigate to={`/lernpfad/${stage.id}`} replace />;

  const chapterIndex = stage.chapters.indexOf(chapter);
  const nextChapter = stage.chapters[chapterIndex + 1];
  const next = steps[index + 1];
  const prev = steps[index - 1];
  const nextHref = next ? chapterPath(chapter, next.id) : nextChapter ? chapterPath(nextChapter) : `/lernpfad/${stage.id}/abschlusstest`;
  const nextLabel = next ? `Weiter: ${next.label}` : nextChapter ? `Nächstes Kapitel: ${nextChapter.title}` : "Zum Abschlusstest";

  let content: React.ReactNode;
  if (current.id === "lernen") {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="cf-card p-6 sm:p-8">
          <Markdown>{chapter.lesson}</Markdown>
        </article>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <FunkiSays mood="happy">
            <p className="font-display font-bold">Bereit?</p>
            <p className="text-sm">Lies dir die Erklärung durch und probier die Beispiele aus. Dann kommen {chapter.tasks.length} Aufgaben, ein Quiz und ein Projekt.</p>
          </FunkiSays>
          <Link to={nextHref} className="cf-btn cf-btn-primary">Los geht’s <ArrowRight size={18} aria-hidden="true" /></Link>
        </aside>
      </div>
    );
  } else if (current.id.startsWith("aufgabe-")) {
    const i = Number(current.id.split("-")[1]) - 1;
    const task = chapter.tasks[i];
    content = <TaskView key={task.id} task={task} chapter={chapter} index={i} nextHref={nextHref} nextLabel={nextLabel} />;
  } else if (current.id === "quiz") {
    const key = itemKey("quiz", stage.id, chapter.id);
    content = (
      <div className="mx-auto w-full max-w-3xl">
        <QuizView key={chapter.id} questions={chapter.quiz.questions} passScore={QUIZ_PASS} label={`Quiz zu ${chapter.title}`}
          onFinish={(score, correct) => (score >= QUIZ_PASS ? complete(key, { xp: correct * 5, score }).xpGained : 0)}
          resultExtra={(passed) => passed && <Link to={nextHref} className="cf-btn cf-btn-primary">{nextLabel} <ArrowRight size={18} aria-hidden="true" /></Link>} />
      </div>
    );
  } else {
    content = <ProjectView key={chapter.id} chapter={chapter} nextHref={nextHref} nextLabel={nextLabel} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Brotkrumen" className="text-sm font-semibold text-muted">
        <Link to="/lernpfad" className="hover:underline">Lernpfad</Link> › <Link to={`/lernpfad/${stage.id}`} className="hover:underline">{stage.title}</Link> ›{" "}
        <span aria-current="page">{chapter.title}</span>
      </nav>
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border-[2.5px] border-line text-on-color" style={{ background: stage.color }}>
          <Icon name={chapter.icon} size={26} />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-muted">Kapitel {chapterIndex + 1}</p>
          <h1 className="text-3xl font-bold">{chapter.title}</h1>
        </div>
      </header>

      <nav aria-label="Schritte im Kapitel" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max gap-2">
          {steps.map((s) => {
            const done = s.key ? Boolean(progress.completions[s.key]) : false;
            const active = s.id === current.id;
            return (
              <li key={s.id}>
                <Link to={chapterPath(chapter, s.id as StepId)} aria-current={active ? "step" : undefined}
                  className={`flex items-center gap-1.5 rounded-full border-[2.5px] px-3 py-1.5 font-display text-sm font-semibold transition-colors ${
                    active ? "border-line bg-sun text-on-color shadow-[2px_2px_0_var(--cf-shadow)]" : done ? "border-line bg-leaf/80 text-on-color" : "border-line/30 bg-surface hover:border-line"}`}>
                  {done ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : s.id === "lernen" ? <BookOpen size={15} aria-hidden="true" /> : null}
                  {s.label}
                  {done && <span className="sr-only">(geschafft)</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {content}

      <div className="flex flex-wrap justify-between gap-3 border-t-2 border-line/15 pt-4">
        {prev ? (
          <Link to={chapterPath(chapter, prev.id)} className="cf-btn cf-btn-ghost"><ArrowLeft size={18} aria-hidden="true" /> {prev.label}</Link>
        ) : <span />}
        <Link to={nextHref} className="cf-btn">{nextLabel} <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
