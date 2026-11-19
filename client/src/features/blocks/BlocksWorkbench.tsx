/**
 * Arbeitsfläche für Block-Programme: Blockly-Editor + Bühne + (optional)
 * die Python-Übersetzung daneben ("So sieht das als Text aus").
 */
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Code2 } from "lucide-react";
import type { StageSetup } from "../../content/types";
import type { SWorkspace } from "./blockSpecs";
import { BlockEditor, type BlockEditorHandle } from "./BlockEditor";
import { Stage, type StageHandle } from "./Stage";
import { toPython } from "./pythonGen";
import { CodeBlock } from "../../components/ui/CodeBlock";
import { useProgress } from "../progress/store";

export interface BlocksWorkbenchHandle {
  getProgram: () => SWorkspace;
  load: (ws: SWorkspace) => void;
}

interface Props {
  initial: SWorkspace;
  toolbox?: string[];
  setup?: StageSetup;
  onChange?: (ws: SWorkspace) => void;
  /** Zusätzliche Knöpfe (z. B. Prüfen) */
  actions?: React.ReactNode;
  /** Inhalt unter den Knöpfen (z. B. Rückmeldung nach dem Prüfen) */
  aside?: React.ReactNode;
  /** Python-Ansicht von Anfang an zeigen */
  showPython?: boolean;
  /** Python-Knopf überhaupt anbieten */
  allowPython?: boolean;
  editorHeight?: string;
}

export const BlocksWorkbench = forwardRef<BlocksWorkbenchHandle, Props>(function BlocksWorkbench(
  { initial, toolbox, setup, onChange, actions, aside, showPython = false, allowPython = true, editorHeight = "h-[560px]" },
  ref,
) {
  const editorRef = useRef<BlockEditorHandle>(null);
  const stageRef = useRef<StageHandle>(null);
  const [program, setProgram] = useState<SWorkspace>(initial);
  const [pythonOpen, setPythonOpen] = useState(showPython);
  const bumpStat = useProgress((s) => s.bumpStat);
  const python = useMemo(() => (pythonOpen ? toPython(program) : ""), [pythonOpen, program]);

  const handleChange = useCallback((ws: SWorkspace) => {
    setProgram(ws);
    onChange?.(ws);
  }, [onChange]);

  const getProgram = useCallback(() => editorRef.current?.getProgram() ?? initial, [initial]);
  const onBlock = useCallback((id: string | null) => editorRef.current?.highlight(id), []);
  const onRunChange = useCallback((running: boolean) => { if (running) bumpStat("codeRuns"); }, [bumpStat]);

  useImperativeHandle(ref, () => ({
    getProgram,
    load: (ws) => {
      editorRef.current?.load(ws);
      setProgram(ws);
    },
  }), [getProgram]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      <div className="order-2 flex min-w-0 flex-col gap-2 xl:order-1">
        <div className={`overflow-hidden rounded-2xl border-[2.5px] border-line shadow-[4px_4px_0_var(--cf-shadow)] ${editorHeight}`}>
          <BlockEditor ref={editorRef} initial={initial} toolbox={toolbox} onChange={handleChange} />
        </div>
        <p className="text-sm text-muted">
          Tipp: Zieh Blöcke aus den Kategorien links auf die Fläche und steck sie unter „Wenn ▶ angeklickt“. Zum Löschen zurück in die Werkzeugkiste ziehen.
        </p>
      </div>
      <div className="order-1 flex flex-col gap-3 xl:order-2">
        <Stage ref={stageRef} getProgram={getProgram} setup={setup} onBlock={onBlock} onRunChange={onRunChange} />
        <div className="flex flex-wrap gap-2">
          {actions}
          {allowPython && (
            <button type="button" onClick={() => setPythonOpen(!pythonOpen)} aria-pressed={pythonOpen}
              className={`cf-btn cf-btn-sm ${pythonOpen ? "cf-btn-sky" : ""}`}>
              <Code2 size={16} aria-hidden="true" /> {pythonOpen ? "Python ausblenden" : "Als Python ansehen"}
            </button>
          )}
        </div>
        {aside}
        {pythonOpen && (
          <section aria-label="Dein Programm als Python-Code" className="animate-slide-up">
            <p className="mb-1 font-display text-sm font-semibold">So sähe dein Programm als Python-Text aus:</p>
            <CodeBlock code={python} lang="python" className="max-h-80 overflow-auto" />
          </section>
        )}
      </div>
    </div>
  );
});
