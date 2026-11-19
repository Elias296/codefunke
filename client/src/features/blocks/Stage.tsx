import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Grid3x3, Play, Snail, Square } from "lucide-react";
import type { StageSetup } from "../../content/types";
import { KEYS, keyFromEvent, type SBlock, type SWorkspace } from "./blockSpecs";
import { walkBlocks } from "./checks";
import { initialWorld, Runtime, STAGE_H, STAGE_W, TICKS_PER_SECOND, type WorldState } from "./runtime";
import { renderStage } from "./stageRenderer";

const KEY_SYMBOLS: Record<string, string> = { oben: "▲", unten: "▼", links: "◀", rechts: "▶", leertaste: "Leertaste" };

export interface StageHandle {
  run: () => void;
  stop: () => void;
}

interface Props {
  /** Liefert das aktuelle Programm beim Start */
  getProgram: () => SWorkspace;
  setup?: StageSetup;
  /** Block-ID, die gerade läuft (nur im Langsam-Modus) */
  onBlock?: (id: string | null) => void;
  onRunChange?: (running: boolean) => void;
  compact?: boolean;
}

/** Die Bühne mit Funki: Start/Stopp, Langsam-Modus, Koordinatengitter, Tastatur- und Mausbedienung. */
export const Stage = forwardRef<StageHandle, Props>(function Stage({ getProgram, setup, onBlock, onRunChange, compact }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rtRef = useRef<Runtime | null>(null);
  const worldRef = useRef<WorldState>(initialWorld(setup));
  const frameRef = useRef<number>(0);
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(false);
  const [grid, setGrid] = useState(Boolean(setup?.grid));
  const [status, setStatus] = useState("Bereit. Drücke ▶ Start!");
  /** Tasten, auf die das Programm hört – dafür gibt es Bildschirm-Tasten (Tablet/Handy) */
  const [keysUsed, setKeysUsed] = useState<string[]>([]);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const draw = useCallback(() => {
    if (canvasRef.current) renderStage(canvasRef.current, worldRef.current, { grid: gridRef.current, onImageLoad: () => draw() });
  }, []);

  // Neu zeichnen, wenn sich Startzustand oder Gitter ändern
  useEffect(() => {
    if (!rtRef.current) {
      worldRef.current = initialWorld(setup);
      draw();
    }
  }, [setup, draw]);
  useEffect(draw, [grid, draw]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    rtRef.current?.stop();
    rtRef.current = null;
    onBlock?.(null);
    setRunning(false);
    onRunChange?.(false);
    setStatus("Gestoppt.");
  }, [onBlock, onRunChange]);

  const run = useCallback(() => {
    stop();
    const program = getProgram();
    const rt = new Runtime(program, setup, { slowTicks: slow ? 18 : 0, onBlock: slow ? (id) => onBlock?.(id ?? null) : undefined });
    rtRef.current = rt;
    worldRef.current = rt.world;
    const listens = (program.blocks?.blocks ?? []).some((b) => b.type === "event_key" || b.type === "event_click");
    const keys = new Set<string>();
    walkBlocks(program, (b: SBlock) => {
      if (b.type === "event_key" || b.type === "sensing_key") keys.add(String(b.fields?.KEY));
    });
    setKeysUsed(KEYS.map(([, v]) => v).filter((k) => keys.has(k)));
    rt.start();
    setRunning(true);
    onRunChange?.(true);
    setStatus(listens ? "Läuft – Funki hört auf Tasten und Klicks." : "Läuft …");
    wrapRef.current?.focus({ preventScroll: true });

    let last = performance.now();
    let acc = 0;
    let busy = false;
    const loop = async (now: number) => {
      if (rtRef.current !== rt) return;
      acc += Math.min(100, now - last);
      last = now;
      if (!busy) {
        busy = true;
        let n = 0;
        while (acc >= 1000 / TICKS_PER_SECOND && n < 4) {
          await rt.tick();
          acc -= 1000 / TICKS_PER_SECOND;
          n++;
        }
        busy = false;
        draw();
        if (rtRef.current !== rt) return;
        if (!rt.isRunning && !listens) {
          rtRef.current = null;
          onBlock?.(null);
          setRunning(false);
          onRunChange?.(false);
          setStatus(rt.warnings.length ? `Fertig – Hinweis: ${rt.warnings[0]}` : "Fertig! Drück nochmal ▶ Start.");
          return;
        }
      }
      frameRef.current = requestAnimationFrame((t) => void loop(t));
    };
    frameRef.current = requestAnimationFrame((t) => void loop(t));
  }, [getProgram, setup, slow, onBlock, onRunChange, draw, stop]);

  useImperativeHandle(ref, () => ({ run, stop }), [run, stop]);
  useEffect(() => () => { cancelAnimationFrame(frameRef.current); rtRef.current?.stop(); }, []);

  // Tastatur: nur, wenn der Fokus auf der Bühne liegt oder nirgendwo
  useEffect(() => {
    const isForStage = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !t || t === document.body || Boolean(wrapRef.current?.contains(t) && t.tagName !== "INPUT");
    };
    const down = (e: KeyboardEvent) => {
      const key = keyFromEvent(e.key);
      if (!key || !rtRef.current || !isForStage(e)) return;
      if (key === "leertaste" && (e.target as HTMLElement)?.tagName === "BUTTON") return;
      e.preventDefault();
      if (!e.repeat) rtRef.current.pressKey(key);
    };
    const up = (e: KeyboardEvent) => {
      const key = keyFromEvent(e.key);
      if (key) rtRef.current?.releaseKey(key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * STAGE_W - STAGE_W / 2;
    const y = STAGE_H / 2 - ((e.clientY - rect.top) / rect.height) * STAGE_H;
    rtRef.current?.click(x, y);
  };

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col gap-2 outline-none">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} className="cf-btn cf-btn-go cf-btn-sm" aria-label="Programm starten">
          <Play size={18} strokeWidth={2.6} fill="currentColor" aria-hidden="true" /> Start
        </button>
        <button type="button" onClick={stop} disabled={!running} className="cf-btn cf-btn-danger cf-btn-sm" aria-label="Programm stoppen">
          <Square size={16} strokeWidth={2.6} fill="currentColor" aria-hidden="true" /> Stopp
        </button>
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => setSlow(!slow)} aria-pressed={slow} className={`cf-btn cf-btn-sm !px-2.5 ${slow ? "cf-btn-sun" : ""}`}
            title="Langsam: Jeder Block wird einzeln ausgeführt und markiert">
            <Snail size={18} aria-hidden="true" /> {!compact && "Langsam"}
          </button>
          <button type="button" onClick={() => setGrid(!grid)} aria-pressed={grid} className={`cf-btn cf-btn-sm !px-2.5 ${grid ? "cf-btn-sun" : ""}`}
            title="Koordinatengitter anzeigen">
            <Grid3x3 size={18} aria-hidden="true" /> {!compact && "Gitter"}
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border-[2.5px] border-line shadow-[4px_4px_0_var(--cf-shadow)]">
        <canvas ref={canvasRef} onClick={onCanvasClick} className="block aspect-[4/3] w-full cursor-pointer touch-manipulation"
          role="img" aria-label="Bühne mit Funki. Klicke hierher und benutze die Pfeiltasten, wenn dein Programm auf Tasten hört." />
      </div>
      {running && keysUsed.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2" aria-label="Bildschirm-Tasten">
          {keysUsed.map((k) => (
            <button key={k} type="button" className="cf-btn cf-btn-sm min-w-12 select-none touch-none"
              onPointerDown={(e) => { e.preventDefault(); rtRef.current?.pressKey(k); }}
              onPointerUp={() => rtRef.current?.releaseKey(k)} onPointerLeave={() => rtRef.current?.releaseKey(k)}
              aria-label={`Taste ${KEYS.find(([, v]) => v === k)?.[0] ?? k}`}>
              {KEY_SYMBOLS[k] ?? k.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <p className="text-sm text-muted" role="status" aria-live="polite">{status}</p>
    </div>
  );
});
