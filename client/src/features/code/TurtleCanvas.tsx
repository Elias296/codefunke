/**
 * Zeichenfläche für das Python-Modul "turtle".
 * Die Befehle kommen aus dem Worker und werden schrittweise animiert.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { TurtleCmd } from "../runners/python/pythonRunner";

export interface TurtleHandle {
  reset: () => void;
  push: (cmds: TurtleCmd[]) => void;
}

const SIZE = 400;
/** Pixel pro Bild für speed(1) … speed(10) */
const SPEEDS = [0, 2, 3, 5, 7, 10, 14, 20, 28, 40, 60];

interface TState { x: number; y: number; h: number; visible: boolean; speed: number }

export const TurtleCanvas = forwardRef<TurtleHandle, { className?: string }>(function TurtleCanvas({ className = "" }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paper = useRef<HTMLCanvasElement | null>(null);
  const queue = useRef<TurtleCmd[]>([]);
  const turtles = useRef(new Map<number, TState>());
  const bg = useRef("#ffffff");
  const frame = useRef(0);
  // Fortschritt einer gerade animierten Linie
  const partial = useRef<{ cmd: TurtleCmd; done: number; from: { x: number; y: number } } | null>(null);

  const paperCtx = () => {
    if (!paper.current) {
      paper.current = document.createElement("canvas");
      paper.current.width = SIZE * 2;
      paper.current.height = SIZE * 2;
    }
    const ctx = paper.current.getContext("2d")!;
    ctx.setTransform(2, 0, 0, -2, SIZE, SIZE); // Mitte = (0,0), y nach oben
    return ctx;
  };

  const clearPaper = () => {
    const ctx = paperCtx();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, SIZE * 2, SIZE * 2);
    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) { canvas.width = SIZE * dpr; canvas.height = SIZE * dpr; }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg.current;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (paper.current) ctx.drawImage(paper.current, 0, 0, SIZE, SIZE);
    for (const t of turtles.current.values()) {
      if (!t.visible) continue;
      ctx.save();
      ctx.translate(SIZE / 2 + t.x, SIZE / 2 - t.y);
      ctx.rotate((-t.h * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fillStyle = "#2ec4b6";
      ctx.strokeStyle = "#1d1b3a";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  const turtle = (id: number): TState => {
    let t = turtles.current.get(id);
    if (!t) { t = { x: 0, y: 0, h: 0, visible: true, speed: 6 }; turtles.current.set(id, t); }
    return t;
  };

  /**
   * Arbeitet die Warteschlange ab. Pro Bild darf die Turtle so viele Pixel
   * laufen, wie ihre Geschwindigkeit erlaubt (speed(0) = sofort).
   */
  const step = () => {
    frame.current = 0;
    const ctx = paperCtx();
    let pixels = Number.NaN; // wird bei der ersten Bewegung gesetzt
    let processed = 0;
    while (queue.current.length && processed < 5000) {
      const cmd = queue.current[0];
      const t = cmd.t !== undefined ? turtle(Number(cmd.t)) : null;
      if (cmd.op === "move" && t) {
        if (Number.isNaN(pixels)) pixels = t.speed === 0 ? Infinity : SPEEDS[Math.min(10, Math.max(1, Math.round(t.speed)))];
        if (pixels <= 0) break;
        const p = partial.current?.cmd === cmd ? partial.current : (partial.current = { cmd, done: 0, from: { x: t.x, y: t.y } });
        const tx = Number(cmd.x);
        const ty = Number(cmd.y);
        const len = Math.hypot(tx - p.from.x, ty - p.from.y);
        const advance = Math.min(len - p.done, pixels);
        const f = len === 0 ? 1 : (p.done + advance) / len;
        const nx = p.from.x + (tx - p.from.x) * f;
        const ny = p.from.y + (ty - p.from.y) * f;
        if (cmd.pen) {
          ctx.strokeStyle = String(cmd.color);
          ctx.lineWidth = Number(cmd.w) || 1;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
        }
        t.x = nx;
        t.y = ny;
        pixels -= advance;
        p.done += advance;
        if (p.done >= len - 1e-9) {
          queue.current.shift();
          partial.current = null;
          processed++;
        }
        continue;
      }
      queue.current.shift();
      processed++;
      switch (cmd.op) {
        case "reset":
          clearPaper(); turtles.current.clear(); bg.current = "#ffffff"; break;
        case "new": turtle(Number(cmd.t)); break;
        case "turn": if (t) t.h = Number(cmd.h); break;
        case "speed": if (t) t.speed = Number(cmd.speed); break;
        case "visible": if (t) t.visible = Boolean(cmd.v); break;
        case "bg": bg.current = String(cmd.color); break;
        case "clear": clearPaper(); break;
        case "dot":
          ctx.fillStyle = String(cmd.color);
          ctx.beginPath();
          ctx.arc(Number(cmd.x), Number(cmd.y), Number(cmd.size) / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "fill": {
          const pts = cmd.points as [number, number][];
          ctx.fillStyle = String(cmd.color);
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          // Füllung hinter die schon gemalten Linien legen
          ctx.globalCompositeOperation = "destination-over";
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          break;
        }
        case "write": {
          ctx.save();
          ctx.scale(1, -1);
          ctx.fillStyle = String(cmd.color);
          ctx.font = `600 ${Number(cmd.size) || 14}px "Nunito Variable", sans-serif`;
          ctx.textAlign = (String(cmd.align) as CanvasTextAlign) || "left";
          ctx.fillText(String(cmd.text), Number(cmd.x), -Number(cmd.y));
          ctx.restore();
          break;
        }
      }
    }
    draw();
    if (queue.current.length) frame.current = requestAnimationFrame(step);
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      queue.current = [];
      partial.current = null;
      turtles.current.clear();
      bg.current = "#ffffff";
      clearPaper();
      draw();
    },
    push: (cmds) => {
      queue.current.push(...cmds);
      if (!frame.current) frame.current = requestAnimationFrame(step);
    },
  }), []);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(frame.current);
  }, []);

  return (
    <div className={`overflow-hidden rounded-2xl border-[2.5px] border-line bg-white ${className}`}>
      <canvas ref={canvasRef} className="block aspect-square w-full" role="img" aria-label="Turtle-Zeichenfläche" />
    </div>
  );
});
