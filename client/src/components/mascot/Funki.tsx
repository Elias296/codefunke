import { useMemo } from "react";
import { funkiSvg, type FunkiMood } from "./funki";

interface Props {
  mood?: FunkiMood;
  size?: number | string;
  color?: string;
  float?: boolean;
  className?: string;
  /** Beschreibender Text für Screenreader; ohne label ist Funki rein dekorativ */
  label?: string;
}

/** Das Maskottchen Funki als React-Komponente. */
export function Funki({ mood = "happy", size = 120, color, float = false, className = "", label }: Props) {
  // Das SVG stammt aus unserem eigenen Code (keine Nutzereingaben) – daher ist innerHTML hier unbedenklich.
  const svg = useMemo(() => funkiSvg({ mood, color }), [mood, color]);
  return (
    <span
      className={`inline-block shrink-0 ${float ? "animate-float" : ""} ${className}`}
      style={{ width: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Funki mit Sprechblase – für Feedback, Tipps und leere Zustände */
export function FunkiSays({ mood = "happy", children, size = 84, tone = "default" }: { mood?: FunkiMood; children: React.ReactNode; size?: number; tone?: "default" | "success" | "error" | "warn" }) {
  const bg = { default: "bg-surface", success: "bg-success-bg", error: "bg-error-bg", warn: "bg-warn-bg" }[tone];
  return (
    <div className="flex items-end gap-2">
      <Funki mood={mood} size={size} />
      <div className={`cf-card relative mb-4 flex-1 px-4 py-3 ${bg} animate-slide-up`}>
        <span aria-hidden="true" className="absolute -left-[11px] bottom-4 h-5 w-5 rotate-45 border-b-[2.5px] border-l-[2.5px] border-line" style={{ background: "inherit" }} />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
