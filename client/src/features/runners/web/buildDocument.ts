/** Setzt HTML, CSS und JavaScript zu einem Dokument für die Vorschau zusammen. */
export interface WebFiles {
  html: string;
  css: string;
  js: string;
}

export function buildDocument({ html, css, js }: WebFiles): string {
  let doc = html.trim() ? html : "<!doctype html><html><head></head><body></body></html>";
  const style = css.trim() ? `<style>\n${css}\n</style>` : "";
  const script = js.trim() ? `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>` : "";
  if (style) doc = /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${style}\n</head>`) : style + doc;
  if (script) doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${script}\n</body>`) : doc + script;
  return doc;
}

/** Ein Web-Projekt wird als JSON gespeichert: {"html": "...", "css": "...", "js": "..."} */
export function parseWebProject(code: string): WebFiles {
  try {
    const v = JSON.parse(code) as Partial<WebFiles>;
    return { html: v.html ?? "", css: v.css ?? "", js: v.js ?? "" };
  } catch {
    return { html: code, css: "", js: "" };
  }
}

export const WEB_STARTER: WebFiles = {
  html: `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Meine Seite</title>
</head>
<body>
  <h1>Hallo, ich bin eine Webseite!</h1>
  <p>Ändere mich und schau, was passiert.</p>
  <button id="knopf">Klick mich</button>
</body>
</html>`,
  css: `body {
  font-family: sans-serif;
  background: #fff8ec;
  color: #1d1b3a;
  padding: 1rem;
}

h1 {
  color: #ff6b35;
}

button {
  font-size: 1.1rem;
  padding: 0.5rem 1rem;
  border-radius: 10px;
}`,
  js: `const knopf = document.getElementById("knopf");

knopf.addEventListener("click", () => {
  knopf.textContent = "Danke! 🎉";
  console.log("Der Knopf wurde geklickt.");
});`,
};
