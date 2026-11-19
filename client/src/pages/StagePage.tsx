import { Link, useParams } from "react-router";
import { ArrowRight, Check, Clock, GraduationCap, Lock } from "lucide-react";
import { itemKey } from "@shared/progress.ts";
import { getStage, stages } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { chapterPath, chapterProgress, chapterSteps, isStageUnlocked, requiredStage, stageProgress } from "../features/progress/unlock";
import { Icon } from "../components/ui/Icon";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Funki, FunkiSays } from "../components/mascot/Funki";
import { NotFoundPage } from "./NotFoundPage";

export function StagePage() {
  const { stageId } = useParams();
  const stage = getStage(stageId);
  const progress = useProgress((s) => s.data);
  if (!stage) return <NotFoundPage />;
  const unlocked = isStageUnlocked(stage, stages, progress);
  const sp = stageProgress(stage, progress);
  const req = requiredStage(stage, stages);
  const final = progress.completions[itemKey("final", stage.id)];

  return (
    <div className="flex flex-col gap-8">
      <nav aria-label="Brotkrumen" className="text-sm font-semibold text-muted">
        <Link to="/lernpfad" className="hover:underline">Lernpfad</Link> › <span aria-current="page">{stage.title}</span>
      </nav>
      <header className="cf-card relative overflow-hidden p-6 sm:p-8" style={{ background: `color-mix(in srgb, ${stage.color} 22%, var(--cf-surface))` }}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl border-[3px] border-line text-on-color shadow-[4px_4px_0_var(--cf-shadow)]" style={{ background: stage.color }}>
            <Icon name={stage.icon} size={40} />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold">Stufe {stage.order} · {stage.short}</p>
            <h1 className="text-4xl font-bold">{stage.title}</h1>
            <p className="mt-2 max-w-2xl text-lg">{stage.description}</p>
          </div>
          {stage.status === "verfuegbar" && (
            <ProgressRing value={sp.fraction} size={84} stroke={9} color={stage.color}>
              <span className="font-display text-lg font-bold">{Math.round(sp.fraction * 100)}%</span>
            </ProgressRing>
          )}
        </div>
      </header>

      {stage.status === "bald" ? (
        <section className="flex flex-col gap-4">
          <FunkiSays mood="think">
            <p className="font-display text-lg font-bold">Diese Stufe ist noch in der Werkstatt!</p>
            <p>Hier kommt bald Neues. Das ist geplant:</p>
          </FunkiSays>
          <ol className="grid gap-3 sm:grid-cols-2">
            {(stage.planned ?? []).map((p, i) => (
              <li key={i} className="cf-card-flat flex gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-line bg-surface-2 font-display font-bold">{i + 1}</span>
                <div>
                  <p className="font-display font-bold">{p.title}</p>
                  <p className="text-sm text-muted">{p.summary}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-2 text-muted"><Clock size={18} aria-hidden="true" /> Im Editor kannst du {stage.short} trotzdem schon ausprobieren.</p>
          <Link to={`/editor/${stage.language}`} className="cf-btn self-start">Im Editor ausprobieren <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      ) : !unlocked ? (
        <FunkiSays mood="think" tone="warn">
          <p className="flex items-center gap-2 font-display text-lg font-bold"><Lock size={20} aria-hidden="true" /> Noch gesperrt</p>
          <p>Bestehe zuerst den Abschlusstest von „{req?.title}“. Dann geht es hier weiter!</p>
          {req && <Link to={`/lernpfad/${req.id}`} className="cf-btn cf-btn-sm mt-2">Zu {req.short}</Link>}
        </FunkiSays>
      ) : (
        <>
          <section aria-labelledby="kapitel-titel" className="flex flex-col gap-4">
            <h2 id="kapitel-titel" className="text-2xl font-bold">Kapitel</h2>
            <ol className="grid gap-4 md:grid-cols-2">
              {stage.chapters.map((chapter, i) => {
                const cp = chapterProgress(chapter, progress);
                const steps = chapterSteps(chapter).filter((s) => s.key);
                return (
                  <li key={chapter.id}>
                    <Link to={chapterPath(chapter)} className="cf-card flex h-full gap-4 p-5 transition-transform hover:-translate-y-0.5">
                      <div className="flex flex-col items-center gap-2">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl border-[2.5px] border-line text-on-color" style={{ background: stage.color }}>
                          <Icon name={chapter.icon} size={24} />
                        </span>
                        <span className="font-display text-sm font-bold text-muted">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-bold">{chapter.title}</h3>
                        <p className="text-muted">{chapter.summary}</p>
                        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Schritte">
                          {steps.map((s) => (
                            <li key={s.id} title={s.label}
                              className={`grid h-6 min-w-6 place-items-center rounded-full border-2 border-line px-1.5 text-xs font-bold ${progress.completions[s.key!] ? "bg-leaf text-on-color" : "bg-surface"}`}>
                              {progress.completions[s.key!] ? <Check size={12} strokeWidth={3.5} aria-label={`${s.label} geschafft`} /> : <span className="sr-only">{s.label} offen</span>}
                              <span aria-hidden="true">{progress.completions[s.key!] ? "" : s.id === "quiz" ? "?" : s.id === "projekt" ? "★" : s.label.replace("Aufgabe ", "")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <ProgressRing value={cp.fraction} size={46} color={stage.color} label={`${cp.done} von ${cp.total} geschafft`}>
                        {cp.complete ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <span className="text-xs font-bold">{cp.done}/{cp.total}</span>}
                      </ProgressRing>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          {stage.finalTest && (
            <section className="cf-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center" style={{ background: final?.passed ? "var(--cf-success-bg)" : undefined }}>
              <Funki mood={final?.passed ? "cheer" : "happy"} size={96} />
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-2xl font-bold"><GraduationCap aria-hidden="true" /> {stage.finalTest.title}</h2>
                <p className="text-muted">{final?.passed ? `Bestanden mit ${Math.round((final.score ?? 1) * 100)} %! Die nächste Stufe ist frei.` : stage.finalTest.intro}</p>
                {!final?.passed && !sp.complete && <p className="mt-1 text-sm">Tipp: Am besten erst alle Kapitel machen – du darfst den Test aber jederzeit versuchen.</p>}
              </div>
              <Link to={`/lernpfad/${stage.id}/abschlusstest`} className={`cf-btn ${final?.passed ? "" : "cf-btn-primary"}`}>
                {final?.passed ? "Nochmal machen" : "Zum Test"} <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
