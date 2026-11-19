/**
 * Funki – der kleine Drache von Codefunke.
 *
 * Erzeugt Funki als SVG-Text. Der gleiche Code wird für das Maskottchen in der
 * Oberfläche und für die Figur auf der Bühne (Block-Editor) verwendet.
 * Funki schaut nach rechts – das passt zu "Richtung 90°" auf der Bühne.
 */

export type FunkiMood = "happy" | "cheer" | "think" | "oops" | "wave";

export interface FunkiOptions {
  mood?: FunkiMood;
  /** Körperfarbe (Standard: Flammen-Orange) */
  color?: string;
  /** Umrissfarbe */
  ink?: string;
}

/** Hellt/verdunkelt eine Hex-Farbe (amount -1..1) */
function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const ch = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function funkiSvg({ mood = "happy", color = "#ff6b35", ink = "#1d1b3a" }: FunkiOptions = {}): string {
  const body = color;
  const light = shade(color, 0.18);
  const belly = "#ffd45c";
  const accent = "#2ec4b6";
  // Umriss-Attribute (Breite als Parameter – doppelte Attribute würden das SVG als Bild ungültig machen)
  const s = (w = 3.5) => `stroke="${ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  // Augen & Mund je nach Stimmung
  let eye = `
    <ellipse cx="87" cy="40" rx="8" ry="9" fill="#fff" ${s(2.6)}/>
    <circle cx="89.5" cy="41.5" r="4.4" fill="${ink}"/>
    <circle cx="91" cy="39.6" r="1.6" fill="#fff"/>`;
  let mouth = `<path d="M97 61 q 6 5 13 -0.5" fill="none" ${s(2.6)}/>`;
  let extra = "";

  if (mood === "cheer") {
    eye = `<path d="M81 42 q 6 -8 12 0" fill="none" ${s(3)}/>`;
    mouth = `<path d="M96 59 q 7 11 15 -1 z" fill="#8a2335" ${s(2.6)}/><path d="M100 63 q 3 3 7 0" fill="none" stroke="#ff8fa3" stroke-width="2"/>`;
    extra = sparks(ink);
  } else if (mood === "think") {
    eye = `
      <ellipse cx="87" cy="40" rx="8" ry="9" fill="#fff" ${s(2.6)}/>
      <circle cx="90" cy="37" r="4.2" fill="${ink}"/>
      <circle cx="91.4" cy="35.4" r="1.5" fill="#fff"/>`;
    mouth = `<path d="M98 61 l 10 -1.5" fill="none" ${s(2.6)}/>`;
    extra = `<circle cx="112" cy="20" r="3" fill="${ink}"/><circle cx="119" cy="12" r="4" fill="${ink}"/>`;
  } else if (mood === "oops") {
    mouth = `<path d="M96 61 q 3 -3.5 6 0 q 3 3.5 6 0 q 2 -2 4 0" fill="none" ${s(2.4)}/>`;
    extra = `<path d="M66 20 c -4 6 -5 9 -2 11 c 3 2 6 -1 5 -4 c 0 -2 -1 -4 -3 -7 z" fill="#7cc8ff" ${s(2)}/>`;
  } else if (mood === "wave") {
    extra = `<path d="M48 70 c -8 -6 -12 -16 -6 -22" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>
      <path d="M48 70 c -8 -6 -12 -16 -6 -22" fill="none" stroke="${body}" stroke-width="5" stroke-linecap="round"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 112" role="img" aria-hidden="true">
  <!-- Schwanz mit Flammenspitze -->
  <path d="M36 88 C 20 96, 6 86, 9 68" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>
  <path d="M36 88 C 20 96, 6 86, 9 68" fill="none" stroke="${body}" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M9 70 c -7 -4 -8 -12 -1 -20 c 7 6 8 14 1 20 z" fill="${belly}" ${s(3)}/>
  <!-- Rückenzacken -->
  <path d="M33 66 l -4 -11 l 11 4 z" fill="${accent}" ${s(3)}/>
  <path d="M43 58 l -1 -12 l 10 7 z" fill="${accent}" ${s(3)}/>
  <!-- Hörner -->
  <path d="M70 27 l -2 -13 l 10 8 z" fill="${belly}" ${s(3)}/>
  <path d="M83 23 l 3 -13 l 6 11 z" fill="${belly}" ${s(3)}/>
  <!-- Füße -->
  <ellipse cx="46" cy="101" rx="10" ry="6.5" fill="${light}" ${s()}/>
  <ellipse cx="70" cy="101" rx="10" ry="6.5" fill="${light}" ${s()}/>
  <!-- Umrisse von Körper, Kopf und Schnauze (werden darunter verschmolzen) -->
  <g ${s(7)} fill="${ink}">
    <ellipse cx="56" cy="78" rx="29" ry="24"/>
    <circle cx="81" cy="46" r="25"/>
    <ellipse cx="103" cy="54" rx="13" ry="10.5"/>
  </g>
  <g fill="${body}">
    <ellipse cx="56" cy="78" rx="29" ry="24"/>
    <circle cx="81" cy="46" r="25"/>
    <ellipse cx="103" cy="54" rx="13" ry="10.5" fill="${light}"/>
  </g>
  <!-- Bauch -->
  <ellipse cx="62" cy="85" rx="16" ry="14" fill="${belly}" ${s(2.6)}/>
  <path d="M52 81 h 20 M51 88 h 22" stroke="${shade(belly, -0.18)}" stroke-width="2" stroke-linecap="round"/>
  <!-- Flügel -->
  <path d="M41 74 c -3 -15 8 -24 20 -20 c -3 5 -7 7 -5 12 c -5 0 -10 3 -15 8 z" fill="${accent}" ${s(3)}/>
  <!-- Nasenloch & Wange -->
  <ellipse cx="110" cy="50" rx="1.8" ry="2.4" fill="${ink}"/>
  <ellipse cx="84" cy="56" rx="5.5" ry="3.4" fill="#ff8fb1" opacity="0.75"/>
  ${eye}
  ${mouth}
  ${extra}
</svg>`;
}

function sparks(ink: string): string {
  const star = (x: number, y: number, r: number, fill: string) =>
    `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z" fill="${fill}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
  return star(117, 30, 7, "#ffc93c") + star(108, 12, 5, "#ff6b35") + star(122, 46, 4, "#2ec4b6");
}

/** Funki als data:-URL (für <img> und die Canvas-Bühne) */
export function funkiDataUrl(opts: FunkiOptions = {}): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(funkiSvg(opts))}`;
}
