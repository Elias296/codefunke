// Erzeugt die Tabelle aller Blöcke für docs/INHALTE-ERWEITERN.md
// Aufruf: node scripts/blocks-table.mjs
import { BLOCKS, CATEGORIES, argsOf } from "../client/src/features/blocks/blockSpecs.ts";

const lines = ["| Kategorie | Block | Schreibweise | Typ (für toolbox/checks) |", "|---|---|---|---|"];
for (const b of BLOCKS) {
  const cat = CATEGORIES.find((c) => c.id === b.category)?.name;
  const label = b.parts.map((p) => (typeof p === "string" ? p : `[${p.name}]`)).join(" ");
  const args = argsOf(b).filter((a) => a.kind !== "statement").map((a) => (a.kind === "dropdown" ? `${a.name}:${a.options.length > 6 ? "…" : a.options.map(([, v]) => v).join("/")}` : a.name.toLowerCase()));
  const dsl = b.shape === "reporter" || b.shape === "boolean" ? `(${[b.dsl, ...args].join(" ")})` : [b.dsl, ...args].join(" ");
  lines.push(`| ${cat} | ${label.replace(/\|/g, "\\|")} | \`${dsl}\` | \`${b.type}\` |`);
}
console.log(lines.join("\n"));
