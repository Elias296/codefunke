import { useEffect, useMemo, useRef } from "react";
import { Blockly, blocklyTheme, registerBlocks } from "./blocklySetup";
import { parseDsl, toDsl } from "./dsl";
import type { SWorkspace } from "./blockSpecs";
import { useDark } from "../../lib/useDark";

/** Zeigt ein Block-Programm nur zum Anschauen (z. B. in Erklärungen und Quizfragen). */
export function BlocksPreview({ source, program, scale = 0.9 }: { source?: string; program?: SWorkspace; scale?: number }) {
  const divRef = useRef<HTMLDivElement>(null);
  const dark = useDark();
  const ws = useMemo(() => program ?? parseDsl(source ?? ""), [program, source]);
  const text = useMemo(() => source ?? toDsl(ws), [source, ws]);

  useEffect(() => {
    registerBlocks();
    const div = divRef.current!;
    const workspace = Blockly.inject(div, {
      readOnly: true,
      renderer: "zelos",
      theme: blocklyTheme(dark),
      sounds: false,
      media: `${import.meta.env.BASE_URL}blockly-media/`,
      zoom: { startScale: scale, controls: false, wheel: false },
      move: { scrollbars: false, drag: false, wheel: false },
    });
    Blockly.serialization.workspaces.load(ws, workspace);
    const box = workspace.getBlocksBoundingBox();
    const height = Math.ceil((box.bottom - box.top) * scale + 28);
    const width = Math.ceil((box.right - box.left) * scale + 28);
    div.style.height = `${Math.max(60, height)}px`;
    div.style.minWidth = `${Math.min(width, 640)}px`;
    Blockly.svgResize(workspace);
    // Inhalt in die linke obere Ecke verschieben
    workspace.translate(-box.left * scale + 14, -box.top * scale + 14);
    return () => workspace.dispose();
  }, [ws, dark, scale]);

  return (
    <figure className="cf-blockly my-2 max-w-full overflow-x-auto rounded-2xl border-2 border-line/40 bg-code">
      <div ref={divRef} className="w-full" aria-hidden="true" />
      <figcaption className="sr-only">Block-Programm: {text}</figcaption>
    </figure>
  );
}
