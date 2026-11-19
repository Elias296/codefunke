import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./index.css";
import { App } from "./App";

import { STATIC_MODE } from "./lib/env";
import { ensureIsolation } from "./lib/isolation";

async function start() {
  // Auf GitHub Pages: einmalig Service Worker für SharedArrayBuffer einrichten (lädt ggf. neu)
  if (STATIC_MODE && (await ensureIsolation())) return;
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
