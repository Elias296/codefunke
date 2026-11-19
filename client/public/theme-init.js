// Setzt Farbmodus und Schriftgröße, bevor die Seite gezeichnet wird (kein Aufflackern).
(function () {
  try {
    var s = JSON.parse(localStorage.getItem("codefunke-settings") || "{}").state || {};
    var mode = s.theme || "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var el = document.documentElement;
    el.dataset.theme = dark ? "dark" : "light";
    el.dataset.font = s.fontScale || "normal";
    if (s.readableFont) el.dataset.readable = "true";
    if (s.reduceMotion) el.dataset.motion = "reduce";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
