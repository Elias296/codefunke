/**
 * Code-Editor auf Basis von CodeMirror 6: Syntax-Hervorhebung, Zeilennummern,
 * automatisches Einrücken, Klammern schließen und Fehler-Markierung.
 * Tastatur: Tab rückt ein. Mit Esc und danach Tab verlässt man den Editor.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting, StreamLanguage } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { classHighlighter } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { lua } from "@codemirror/legacy-modes/mode/lua";

export type EditorLanguage = "python" | "html" | "css" | "javascript" | "lua" | "java";

function languageExtension(lang: EditorLanguage): Extension {
  switch (lang) {
    case "python": return [python(), indentUnit.of("    ")];
    case "html": return [html(), indentUnit.of("  ")];
    case "css": return [css(), indentUnit.of("  ")];
    case "javascript": return [javascript(), indentUnit.of("  ")];
    case "java": return [java(), indentUnit.of("    ")];
    case "lua": return [StreamLanguage.define(lua), indentUnit.of("  ")];
  }
}

const theme = EditorView.theme({
  "&": { fontSize: "0.98rem", backgroundColor: "var(--cf-code-bg)", color: "var(--cf-ink)", height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--cf-ink)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "var(--cf-surface-2)", color: "var(--cf-muted)", border: "none", borderRight: "2px solid color-mix(in srgb, var(--cf-line) 20%, transparent)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--color-sun) 14%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--color-sun) 30%, transparent)", color: "var(--cf-ink)" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--cf-focus) 30%, transparent) !important" },
  ".cm-cursor": { borderLeftWidth: "2px", borderLeftColor: "var(--cf-ink)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--color-leaf) 35%, transparent)", outline: "none" },
  ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy var(--cf-error)", textUnderlineOffset: "4px" },
  ".cm-lint-marker-error": { content: "none" },
  ".cm-placeholder": { color: "var(--cf-muted)", fontStyle: "italic" },
  ".cm-tooltip": { border: "2px solid var(--cf-line)", borderRadius: "10px", backgroundColor: "var(--cf-surface)", color: "var(--cf-ink)" },
  ".cm-diagnostic-error": { borderLeft: "4px solid var(--cf-error)" },
});

export interface CodeEditorHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  focus: () => void;
  /** Markiert eine Zeile als fehlerhaft (null = Markierung entfernen) */
  markError: (line: number | null, message?: string) => void;
}

interface Props {
  value: string;
  language: EditorLanguage;
  onChange?: (v: string) => void;
  /** Strg+Enter / Cmd+Enter */
  onRun?: () => void;
  readOnly?: boolean;
  label: string;
  placeholder?: string;
  className?: string;
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor({ value, language, onChange, onRun, readOnly, label, placeholder, className = "" }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const roComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lintGutter(),
          syntaxHighlighting(classHighlighter),
          keymap.of([
            { key: "Mod-Enter", run: () => { onRunRef.current?.(); return true; } },
            ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab,
          ]),
          langComp.current.of(languageExtension(language)),
          roComp.current.of(EditorState.readOnly.of(Boolean(readOnly))),
          theme,
          EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
          placeholder ? cmPlaceholder(placeholder) : [],
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              onChangeRef.current?.(u.state.doc.toString());
              // Fehlermarkierung beim Weiterschreiben entfernen
              u.view.dispatch(setDiagnostics(u.state, []));
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => view.destroy();
    // Nur einmal erstellen – Änderungen laufen über Compartments/setValue
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: langComp.current.reconfigure(languageExtension(language)) });
  }, [language]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: roComp.current.reconfigure(EditorState.readOnly.of(Boolean(readOnly))) });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? "",
    setValue: (v) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
    },
    focus: () => viewRef.current?.focus(),
    markError: (line, message) => {
      const view = viewRef.current;
      if (!view) return;
      if (!line || line < 1 || line > view.state.doc.lines) {
        view.dispatch(setDiagnostics(view.state, []));
        return;
      }
      const l = view.state.doc.line(line);
      const diag: Diagnostic = { from: l.from, to: Math.max(l.to, l.from), severity: "error", message: message ?? "Fehler in dieser Zeile" };
      view.dispatch(setDiagnostics(view.state, [diag]));
      view.dispatch({ effects: EditorView.scrollIntoView(l.from, { y: "center" }) });
    },
  }), []);

  return <div ref={hostRef} className={`h-full min-h-0 overflow-hidden ${className}`} />;
});
