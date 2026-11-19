import { Link, Navigate, useParams } from "react-router";
import { ArrowRight } from "lucide-react";
import { itemKey } from "@shared/progress.ts";
import { getStage, stages } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { isStageUnlocked } from "../features/progress/unlock";
import { QuizView } from "../features/lesson/QuizView";
import { Funki } from "../components/mascot/Funki";
import { NotFoundPage } from "./NotFoundPage";

/** Abschlusstest einer Stufe – bestehen schaltet die nächste Stufe frei */
export default function FinalTestPage() {
  const { stageId } = useParams();
  const stage = getStage(stageId);
  const progress = useProgress((s) => s.data);
  const complete = useProgress((s) => s.complete);
  if (!stage?.finalTest) return <NotFoundPage />;
  if (!isStageUnlocked(stage, stages, progress)) return <Navigate to={`/lernpfad/${stage.id}`} replace />;
  const test = stage.finalTest;
  const nextStage = stages.find((s) => s.order > stage.order && s.status === "verfuegbar");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav aria-label="Brotkrumen" className="text-sm font-semibold text-muted">
        <Link to="/lernpfad" className="hover:underline">Lernpfad</Link> › <Link to={`/lernpfad/${stage.id}`} className="hover:underline">{stage.title}</Link> ›{" "}
        <span aria-current="page">Abschlusstest</span>
      </nav>
      <header className="flex items-center gap-4">
        <Funki mood="think" size={96} />
        <div>
          <h1 className="text-3xl font-bold">{test.title}</h1>
          <p className="text-muted">{test.intro} Zum Bestehen brauchst du {Math.round(test.passScore * 100)} % richtige Antworten.</p>
        </div>
      </header>
      <QuizView questions={test.questions} passScore={test.passScore} label={test.title}
        onFinish={(score, correct) => (score >= test.passScore ? complete(itemKey("final", stage.id), { xp: 100 + correct * 2, score, passed: true }).xpGained : 0)}
        resultExtra={(passed) =>
          passed ? (
            nextStage ? (
              <Link to={`/lernpfad/${nextStage.id}`} className="cf-btn cf-btn-primary">Stufe {nextStage.order} „{nextStage.short}“ ist frei! <ArrowRight size={18} aria-hidden="true" /></Link>
            ) : (
              <p className="font-display text-lg font-bold">Du hast alle verfügbaren Stufen geschafft – neue kommen bald!</p>
            )
          ) : (
            <Link to={`/lernpfad/${stage.id}`} className="cf-btn">Kapitel wiederholen</Link>
          )
        } />
    </div>
  );
}
