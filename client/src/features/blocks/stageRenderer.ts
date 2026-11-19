/**
 * Zeichnet den Zustand der Bühne auf ein Canvas.
 * Koordinaten: Mitte = (0, 0), x nach rechts, y nach oben (wie in Scratch).
 */
import { funkiDataUrl } from "../../components/mascot/funki";
import { backgroundValue, colorValue, formatValue, STAGE_H, STAGE_W, type WorldState } from "./runtime";

const spriteCache = new Map<string, HTMLImageElement>();

function spriteImage(color: string, onLoad: () => void): HTMLImageElement {
  let img = spriteCache.get(color);
  if (!img) {
    img = new Image();
    img.src = funkiDataUrl({ color: colorValue(color) });
    spriteCache.set(color, img);
  }
  if (!img.complete) img.addEventListener("load", onLoad, { once: true });
  return img;
}

const SPRITE_W = 74;
const SPRITE_H = (SPRITE_W * 112) / 128;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.48;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = "#ffc93c";
  ctx.strokeStyle = "#1d1b3a";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function bubble(ctx: CanvasRenderingContext2D, text: string, sx: number, sy: number) {
  ctx.font = '600 15px "Fredoka Variable", Fredoka, sans-serif';
  const lines = wrapText(ctx, text, 170);
  const w = Math.max(44, ...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = lines.length * 19 + 16;
  let bx = sx + 18;
  let by = sy - SPRITE_H / 2 - h - 6;
  bx = Math.min(Math.max(4, bx), STAGE_W - w - 4);
  by = Math.max(4, by);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1d1b3a";
  ctx.lineWidth = 2.5;
  roundRect(ctx, bx, by, w, h, 12);
  ctx.fill();
  ctx.stroke();
  // Spitze
  ctx.beginPath();
  ctx.moveTo(bx + 16, by + h - 1);
  ctx.lineTo(Math.min(Math.max(sx, bx + 6), bx + w - 6), Math.min(sy - 10, by + h + 16));
  ctx.lineTo(bx + 32, by + h - 1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1d1b3a";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 9 + i * 19));
}

export function renderStage(canvas: HTMLCanvasElement, world: WorldState, opts: { grid?: boolean; onImageLoad?: () => void } = {}) {
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== STAGE_W * dpr) {
    canvas.width = STAGE_W * dpr;
    canvas.height = STAGE_H * dpr;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toX = (x: number) => STAGE_W / 2 + x;
  const toY = (y: number) => STAGE_H / 2 - y;

  ctx.fillStyle = backgroundValue(world.background);
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  if (opts.grid) {
    ctx.lineWidth = 1;
    ctx.font = '600 10px "Nunito Variable", sans-serif';
    ctx.fillStyle = "rgba(29,27,58,0.55)";
    for (let x = -200; x <= 200; x += 50) {
      ctx.strokeStyle = x === 0 ? "rgba(29,27,58,0.45)" : "rgba(29,27,58,0.12)";
      ctx.beginPath();
      ctx.moveTo(toX(x), 0);
      ctx.lineTo(toX(x), STAGE_H);
      ctx.stroke();
      if (x !== 0) ctx.fillText(String(x), toX(x) + 3, toY(0) + 3);
    }
    for (let y = -150; y <= 150; y += 50) {
      ctx.strokeStyle = y === 0 ? "rgba(29,27,58,0.45)" : "rgba(29,27,58,0.12)";
      ctx.beginPath();
      ctx.moveTo(0, toY(y));
      ctx.lineTo(STAGE_W, toY(y));
      ctx.stroke();
      if (y !== 0) ctx.fillText(String(y), toX(0) + 3, toY(y) + 3);
    }
    ctx.fillText("x", STAGE_W - 12, toY(0) - 14);
    ctx.fillText("y", toX(0) + 6, 4);
  }

  // Malstift-Linien
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of world.segments) {
    ctx.strokeStyle = colorValue(s.color);
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(toX(s.x1), toY(s.y1));
    ctx.lineTo(toX(s.x2) + (s.x1 === s.x2 && s.y1 === s.y2 ? 0.01 : 0), toY(s.y2));
    ctx.stroke();
  }

  if (world.star.visible) star(ctx, toX(world.star.x), toY(world.star.y), 18, (world.tick / 60) * 0.6);

  const sp = world.sprite;
  if (sp.visible) {
    const img = spriteImage(sp.color, () => opts.onImageLoad?.());
    if (img.complete && img.naturalWidth > 0) {
      const scale = sp.size / 100;
      ctx.save();
      ctx.translate(toX(sp.x), toY(sp.y));
      ctx.rotate(((sp.direction - 90) * Math.PI) / 180);
      ctx.drawImage(img, (-SPRITE_W * scale) / 2, (-SPRITE_H * scale) / 2, SPRITE_W * scale, SPRITE_H * scale);
      ctx.restore();
    }
    if (sp.say) bubble(ctx, sp.say, toX(sp.x), toY(sp.y) + (SPRITE_H * (sp.size / 100 - 1)) / 2);
  }

  // Variablen-Anzeigen oben links
  const vars = Object.entries(world.variables);
  ctx.font = '700 13px "Nunito Variable", sans-serif';
  ctx.textBaseline = "middle";
  vars.slice(0, 6).forEach(([name, value], i) => {
    const label = `${name}: ${formatValue(value)}`;
    const w = ctx.measureText(label).width + 18;
    const y = 8 + i * 28;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "#1d1b3a";
    ctx.lineWidth = 2;
    roundRect(ctx, 8, y, w, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1d1b3a";
    ctx.fillText(label, 17, y + 11.5);
  });
}
