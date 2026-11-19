import { X } from "lucide-react";
import { useToasts } from "../../stores/toasts";
import { Funki } from "../mascot/Funki";
import { Icon } from "../ui/Icon";

/** Benachrichtigungen unten rechts. aria-live sorgt dafür, dass Screenreader sie vorlesen. */
export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-24 right-3 z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-3 md:bottom-6">
      {toasts.map((t) => {
        const bg = t.kind === "error" ? "bg-error-bg" : t.kind === "badge" || t.kind === "level" ? "bg-sun text-on-color" : "bg-surface";
        return (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={`cf-card pointer-events-auto flex items-center gap-3 p-3 animate-pop ${bg}`}>
            {t.kind === "badge" && t.icon ? (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-line bg-surface text-ink"><Icon name={t.icon} size={24} /></span>
            ) : (
              <Funki size={52} mood={t.kind === "error" ? "oops" : "cheer"} />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-tight">{t.title}</p>
              {t.text && <p className="text-sm">{t.text}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded-lg p-1 hover:bg-black/10" aria-label="Benachrichtigung schließen">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
