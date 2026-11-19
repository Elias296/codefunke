// Kopiert die Laufzeit-Dateien für Python (Pyodide), Lua (wasmoon) und Blockly
// nach client/public, damit die Seite sie selbst ausliefert (kein CDN nötig).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const pkgDir = (name, entry) => dirname(require.resolve(entry ?? name));

function copyFiles(fromDir, toDir, files) {
  mkdirSync(toDir, { recursive: true });
  for (const f of files) {
    const target = join(toDir, f);
    if (!existsSync(target)) cpSync(join(fromDir, f), target);
  }
}

const pyodideDir = pkgDir("pyodide", "pyodide/pyodide.mjs");
copyFiles(pyodideDir, join(publicDir, "pyodide"), [
  "pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json",
]);

const wasmoonDir = pkgDir("wasmoon", "wasmoon/dist/index.js");
copyFiles(wasmoonDir, join(publicDir, "lua"), ["glue.wasm"]);

const blocklyDir = pkgDir("blockly", "blockly");
const mediaTarget = join(publicDir, "blockly-media");
if (!existsSync(mediaTarget)) cpSync(join(blocklyDir, "media"), mediaTarget, { recursive: true });

console.log("✓ Laufzeit-Dateien (Pyodide, Lua, Blockly) bereit");
