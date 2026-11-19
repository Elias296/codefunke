import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { FunkiSays } from "../../components/mascot/Funki";
import { Markdown } from "../../components/ui/Markdown";

export interface FeedbackState {
  ok: boolean;
  title: string;
  message?: string;
  xpGained?: number;
  expected?: string;
  actual?: string;
}

/** Rückmeldung nach dem Prüfen – mit Funki */
export function Feedback({ fb, nextHref, nextLabel = "Weiter" }: { fb: FeedbackState; nextHref?: string; nextLabel?: string }) {
  return (
    <div role="status" aria-live="polite">
      <FunkiSays mood={fb.ok ? "cheer" : "oops"} tone={fb.ok ? "success" : "error"}>
        <p className="font-display text-lg font-bold">{fb.title}</p>
        {fb.message && <Markdown className="!text-base">{fb.message}</Markdown>}
        {fb.ok && fb.xpGained !== undefined && fb.xpGained > 0 && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-line bg-sun px-2.5 py-0.5 font-display text-sm font-bold text-on-color">
            +{fb.xpGained} XP
          </p>
        )}
        {(fb.expected !== undefined || fb.actual !== undefined) && (
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="font-display font-semibold">Erwartet:</p>
              <pre className="cf-code max-h-40 overflow-auto whitespace-pre-wrap p-2 [overflow-wrap:anywhere]">{fb.expected || "–"}</pre>
            </div>
            <div>
              <p className="font-display font-semibold">Dein Programm:</p>
              <pre className="cf-code max-h-40 overflow-auto whitespace-pre-wrap p-2 [overflow-wrap:anywhere]">{fb.actual || "(keine Ausgabe)"}</pre>
            </div>
          </div>
        )}
        {fb.ok && nextHref && (
          <Link to={nextHref} className="cf-btn cf-btn-primary mt-3">
            {nextLabel} <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}
      </FunkiSays>
    </div>
  );
}

export function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  const label = ["leicht", "mittel", "knifflig"][level - 1];
  return (
    <span className="cf-pill text-xs" title={`Schwierigkeit: ${label}`}>
      <span aria-hidden="true">{"★".repeat(level)}<span className="opacity-30">{"★".repeat(3 - level)}</span></span>
      <span>{label}</span>
    </span>
  );
}
