// Startet Backend (Port 3001) und Frontend (Vite, Port 5173) gleichzeitig.
// Bewusst ohne Zusatzpaket, damit es auf Windows, macOS und Linux gleich funktioniert.
import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const procs = [
  spawn(npm, ["run", "dev", "-w", "server"], { stdio: "inherit", env: { ...process.env, PORT: "3001", CODEFUNKE_DEV: "1" }, shell: process.platform === "win32" }),
  spawn(npm, ["run", "dev", "-w", "client"], { stdio: "inherit", env: process.env, shell: process.platform === "win32" }),
];

const stopAll = () => procs.forEach((p) => p.kill());
process.on("SIGINT", () => { stopAll(); process.exit(0); });
process.on("SIGTERM", () => { stopAll(); process.exit(0); });
procs.forEach((p) => p.on("exit", (code) => { if (code) { stopAll(); process.exit(code); } }));
