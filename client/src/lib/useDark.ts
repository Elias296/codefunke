import { useEffect, useState } from "react";
import { resolveDark, useSettings } from "../stores/settings";

/** true, wenn gerade der dunkle Modus aktiv ist (auch bei "System") */
export function useDark(): boolean {
  const theme = useSettings((s) => s.theme);
  const [dark, setDark] = useState(() => resolveDark(theme));
  useEffect(() => {
    setDark(resolveDark(theme));
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return dark;
}
