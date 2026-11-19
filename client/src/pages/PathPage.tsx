import { Link } from "react-router";
import { Check, Lock, Clock } from "lucide-react";
import { stages } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { isStageUnlocked, requiredStage, stageProgress } from "../features/progress/unlock";
import { Icon } from "../components/ui/Icon";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Funki } from "../components/mascot/Funki";

/** Der Lernpfad: alle Stufen als Weg von Blöcken bis Java */
export function PathPage() {
  const progress = useProgress((s) => s.data);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Funki mood="wave" size={110} />
        <div>
          <h1 className="text-4xl font-bold">Dein Lernpfad</h1>
          <p className="mt-1 max-w-2xl text-lg text-muted">
            Von bunten Blöcken bis zu echten Programmiersprachen. Jede Stufe schaltest du mit einem Abschlusstest frei.
          </p>
        </div>
      </header>

      <ol className="relative flex flex-col gap-6 md:gap-0" aria-label="Stufen des Lernpfads">
        {/* Gestrichelter Weg in der Mitte (nur Desktop) */}
        <div aria-hidden="true" className="absolute bottom-16 left-1/2 top-16 hidden w-0 -translate-x-1/2 border-l-[5px] border-dashed border-line/25 md:block" />
        {stages.map((stage, i) => {
          const unlocked = isStageUnlocked(stage, stages, progress);
          const sp = stageProgress(stage, progress);
          const soon = stage.status === "bald";
          const req = requiredStage(stage, stages);
          const left = i % 2 === 0;
          const status = sp.passed ? "Bestanden" : soon ? "Kommt bald" : unlocked ? (sp.done > 0 ? "In Arbeit" : "Bereit") : "Gesperrt";
          const card = (
            <div className={`cf-card relative flex w-full items-center gap-4 p-5 transition-transform ${unlocked ? "hover:-translate-y-0.5" : "opacity-90"}`}
              style={{ borderTop: `10px solid ${stage.color}` }}>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-[2.5px] border-line text-on-color" style={{ background: stage.color }}>
                <Icon name={stage.icon} size={32} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-muted">Stufe {stage.order}</p>
                <h2 className="text-2xl font-bold">{stage.title}</h2>
                <p className="text-muted">{stage.subtitle}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 font-display text-sm font-semibold">
                  {sp.passed ? <Check size={16} aria-hidden="true" /> : soon ? <Clock size={16} aria-hidden="true" /> : !unlocked ? <Lock size={16} aria-hidden="true" /> : null}
                  {status}
                  {!unlocked && !soon && req && <span className="font-normal text-muted"> – schaffe zuerst den Abschlusstest „{req.short}“</span>}
                </p>
              </div>
              {!soon && (
                <ProgressRing value={sp.fraction} size={58} color={stage.color} label={`${Math.round(sp.fraction * 100)} Prozent von Stufe ${stage.order}`}>
                  <span className="font-display text-sm font-bold">{Math.round(sp.fraction * 100)}%</span>
                </ProgressRing>
              )}
            </div>
          );
          return (
            <li key={stage.id} className={`relative flex md:w-1/2 md:py-4 ${left ? "md:pr-10" : "md:ml-auto md:pl-10"}`}>
              <span aria-hidden="true" className={`absolute top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-line md:block ${left ? "-right-3" : "-left-3"}`}
                style={{ background: unlocked || sp.passed ? stage.color : "var(--cf-surface)" }} />
              <Link to={`/lernpfad/${stage.id}`} className="block w-full rounded-[1.25rem]" aria-label={`Stufe ${stage.order}: ${stage.title} – ${status}`}>
                {card}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
