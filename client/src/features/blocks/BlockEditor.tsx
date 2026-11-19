import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Blockly, blocklyTheme, buildToolbox, registerBlocks, setupVariableCategory } from "./blocklySetup";
import type { SWorkspace } from "./blockSpecs";
import { useDark } from "../../lib/useDark";

export interface BlockEditorHandle {
  getProgram: () => SWorkspace;
  load: (ws: SWorkspace) => void;
  highlight: (id: string | null) => void;
}

interface Props {
  initial: SWorkspace;
  /** Erlaubte Block-Typen (leer = alle) */
  toolbox?: string[];
  onChange?: (ws: SWorkspace) => void;
  className?: string;
}

const MEDIA = `${import.meta.env.BASE_URL}blockly-media/`;

/** Der Blockly-Editor mit Werkzeugkiste */
export const BlockEditor = forwardRef<BlockEditorHandle, Props>(function BlockEditor({ initial, toolbox, onChange, className = "" }, ref) {
  const divRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dark = useDark();
  const initialRef = useRef(initial);
  const toolboxKey = (toolbox ?? []).join(",");

  useEffect(() => {
    registerBlocks();
    const div = divRef.current!;
    const ws = Blockly.inject(div, {
      toolbox: buildToolbox(toolbox),
      theme: blocklyTheme(dark),
      renderer: "zelos",
      sounds: false,
      media: MEDIA,
      trashcan: true,
      maxTrashcanContents: 20,
      zoom: { controls: true, wheel: false, startScale: 0.78, maxScale: 2, minScale: 0.4, scaleSpeed: 1.15, pinch: true },
      move: { scrollbars: true, drag: true, wheel: true },
      grid: { spacing: 28, length: 3, colour: dark ? "#2a2760" : "#efe3cd", snap: false },
    });
    wsRef.current = ws;
    setupVariableCategory(ws);
    try {
      Blockly.serialization.workspaces.load(initialRef.current, ws);
    } catch (e) {
      console.warn("Programm konnte nicht geladen werden", e);
    }
    const listener = (e: Blockly.Events.Abstract) => {
      if (e.isUiEvent || ws.isDragging()) return;
      onChangeRef.current?.(Blockly.serialization.workspaces.save(ws) as SWorkspace);
    };
    ws.addChangeListener(listener);
    const ro = new ResizeObserver(() => Blockly.svgResize(ws));
    ro.observe(div);
    return () => {
      ro.disconnect();
      ws.dispose();
      wsRef.current = null;
    };
    // Theme wird unten separat umgeschaltet; die Toolbox bestimmt die Neuerstellung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolboxKey]);

  useEffect(() => {
    wsRef.current?.setTheme(blocklyTheme(dark));
  }, [dark]);

  useImperativeHandle(ref, () => ({
    getProgram: () => (wsRef.current ? (Blockly.serialization.workspaces.save(wsRef.current) as SWorkspace) : initialRef.current),
    load: (program) => {
      const ws = wsRef.current;
      if (!ws) return;
      ws.clear();
      Blockly.serialization.workspaces.load(program, ws);
      ws.scrollCenter();
    },
    highlight: (id) => {
      const ws = wsRef.current;
      if (!ws) return;
      ws.highlightBlock(null);
      if (id && ws.getBlockById(id)) ws.highlightBlock(id, true);
    },
  }), []);

  return (
    <div className={`cf-blockly relative h-full min-h-[420px] w-full overflow-hidden ${className}`}>
      <div ref={divRef} className="absolute inset-0" role="application"
        aria-label="Block-Editor: Zieh Blöcke aus der Werkzeugkiste links auf die Fläche und steck sie zusammen." />
    </div>
  );
});
