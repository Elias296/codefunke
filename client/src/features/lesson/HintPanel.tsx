import { useState } from "react";
import { Lightbulb, Eye } from "lucide-react";
import { useProgress } from "../progress/store";
import { Markdown } from "../../components/ui/Markdown";

interface Props {
  progressKey: string;
  hints: [string, string];
  /** Wird angezeigt, wenn die Lösung aufgedeckt ist */
  renderSolution: () => React.ReactNode;
}

/**
 * Drei Hilfe-Stufen: 1 Tipp → 2 größerer Tipp → 3 Lösung.
 * Tipps kosten nichts. Wer die Lösung ansieht, bekommt nur die halbe XP.
 */
export function HintPanel({ progressKey, hints, renderSolution }: Props) {
  const stored = useProgress((s) => s.data.hints[progressKey] ?? 0);
  const useHint = useProgress((s) => s.useHint);
  const [level, setLevel] = useState(stored);
  const [confirming, setConfirming] = useState(false);

  const reveal = (l: number) => {
    setLevel(l);
    useHint(progressKey, l);
  };

  return (
    <section aria-label="Hilfe" className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {level < 1 && (
          <button type="button" className="cf-btn cf-btn-sm" onClick={() => reveal(1)}>
            <Lightbulb size={16} aria-hidden="true" /> Tipp
          </button>
        )}
        {level === 1 && (
          <button type="button" className="cf-btn cf-btn-sm" onClick={() => reveal(2)}>
            <Lightbulb size={16} aria-hidden="true" /> Größerer Tipp
          </button>
        )}
        {level === 2 && !confirming && (
          <button type="button" className="cf-btn cf-btn-sm" onClick={() => setConfirming(true)}>
            <Eye size={16} aria-hidden="true" /> Lösung zeigen
          </button>
        )}
      </div>
      {confirming && level < 3 && (
        <div className="cf-card-flat flex flex-wrap items-center gap-2 bg-warn-bg p-3" role="alertdialog" aria-label="Lösung wirklich zeigen?">
          <p className="flex-1">Probier es ruhig noch einmal! Wenn du die Lösung ansiehst, gibt es nur die halbe XP.</p>
          <button type="button" className="cf-btn cf-btn-sm" onClick={() => setConfirming(false)}>Nochmal probieren</button>
          <button type="button" className="cf-btn cf-btn-sm cf-btn-sun" onClick={() => { reveal(3); setConfirming(false); }}>Lösung zeigen</button>
        </div>
      )}
      {level >= 1 && (
        <div className="cf-card-flat animate-slide-up bg-warn-bg p-3" aria-live="polite">
          <p className="font-display font-bold">💡 Tipp</p>
          <Markdown>{hints[0]}</Markdown>
        </div>
      )}
      {level >= 2 && (
        <div className="cf-card-flat animate-slide-up bg-warn-bg p-3" aria-live="polite">
          <p className="font-display font-bold">🔦 Größerer Tipp</p>
          <Markdown>{hints[1]}</Markdown>
        </div>
      )}
      {level >= 3 && (
        <div className="cf-card-flat animate-slide-up p-3" aria-live="polite">
          <p className="mb-2 font-display font-bold">🗝️ Lösung</p>
          {renderSolution()}
        </div>
      )}
    </section>
  );
}

/** Aktuelle Hilfe-Stufe (für die XP-Berechnung) */
export function hintLevel(progressKey: string): number {
  return useProgress.getState().data.hints[progressKey] ?? 0;
}
