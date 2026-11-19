import { useEffect, useRef, useState } from "react";
import { STATIC_MODE } from "../../../lib/env";

/**
 * Leitet console.log & Fehler aus der Vorschau an die Konsole von Codefunke weiter.
 * (Gleicher Code wie in public/preview.html.)
 */
const CONSOLE_HOOK = `<script>(function () {
  function fmt(v) { if (typeof v === "string") return v; try { return JSON.stringify(v); } catch (e) { return String(v); } }
  ["log", "info", "warn", "error"].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      parent.postMessage({ type: "console", level: level, text: Array.prototype.map.call(arguments, fmt).join(" ") }, "*");
      orig.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (e) {
    parent.postMessage({ type: "console", level: "error", text: e.message + (e.lineno ? " (Zeile " + e.lineno + ")" : "") }, "*");
  });
})();<\/script>`;

interface Props {
  html: string;
  onConsole?: (level: string, text: string) => void;
  className?: string;
}

/**
 * Live-Vorschau für HTML/CSS/JS in einem abgeschotteten iframe.
 * sandbox="allow-scripts" ohne "allow-same-origin": Das Skript in der Vorschau
 * kann nicht auf Cookies, localStorage oder die Codefunke-Seite zugreifen.
 *
 * Mit Server: Die Vorschau lädt public/preview.html (eigene, strenge CSP).
 * Statisch (GitHub Pages): Das Dokument wird direkt per srcdoc eingesetzt –
 * dort gibt es keine CSP, und srcdoc erbt die Isolations-Header der Seite.
 */
export function WebPreview({ html, onConsole, className = "" }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [version, setVersion] = useState(0);
  const htmlRef = useRef(html);
  const onConsoleRef = useRef(onConsole);
  onConsoleRef.current = onConsole;

  // Bei jeder Änderung einen frischen iframe laden (sauberer JavaScript-Zustand)
  useEffect(() => {
    htmlRef.current = html;
    setVersion((v) => v + 1);
  }, [html]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data) return;
      if (e.data.type === "preview-ready") {
        frameRef.current?.contentWindow?.postMessage({ type: "render", html: htmlRef.current }, "*");
      } else if (e.data.type === "console") {
        onConsoleRef.current?.(String(e.data.level), String(e.data.text).slice(0, 2000));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={`overflow-hidden rounded-2xl border-[2.5px] border-line bg-white ${className}`}>
      {STATIC_MODE ? (
        <iframe key={version} ref={frameRef} title="Vorschau deiner Webseite" srcDoc={CONSOLE_HOOK + htmlRef.current}
          sandbox="allow-scripts allow-modals allow-forms" className="block h-full min-h-[300px] w-full border-0 bg-white" />
      ) : (
        <iframe key={version} ref={frameRef} title="Vorschau deiner Webseite" src={`${import.meta.env.BASE_URL}preview.html`}
          sandbox="allow-scripts allow-modals allow-forms" className="block h-full min-h-[300px] w-full border-0 bg-white" />
      )}
    </div>
  );
}
