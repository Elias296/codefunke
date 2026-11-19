/**
 * Verbindet unsere Block-Beschreibungen (blockSpecs.ts) mit Blockly:
 * Block-Definitionen, Farben/Themes (hell & dunkel), Werkzeugkiste und
 * kindgerechte Dialoge (statt window.prompt).
 */
import * as Blockly from "blockly/core";
import "blockly/blocks"; // eingebaute Blöcke math_number und text (für Zahlen-/Textfelder)
import * as De from "blockly/msg/de";
import { argsOf, BLOCKS, CATEGORIES, type ArgSpec, type BlockSpec, type CategoryId } from "./blockSpecs";
import { askText, showMessage } from "../../components/ui/dialog";

Blockly.setLocale(De as unknown as Record<string, string>);

function shade(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const ch = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function argJson(arg: ArgSpec): Record<string, unknown> {
  switch (arg.kind) {
    case "number":
    case "text":
      return { type: "input_value", name: arg.name };
    case "boolean":
      return { type: "input_value", name: arg.name, check: "Boolean" };
    case "dropdown":
      return { type: "field_dropdown", name: arg.name, options: arg.options };
    case "variable":
      return { type: "field_variable", name: arg.name, variable: "punkte" };
    case "statement":
      return { type: "input_statement", name: arg.name };
  }
}

/** Erzeugt die Blockly-JSON-Definition aus einer BlockSpec */
export function blocklyDefinition(spec: BlockSpec): Record<string, unknown> {
  const json: Record<string, unknown> = { type: spec.type, style: `${spec.category}_blocks`, tooltip: spec.tooltip, inputsInline: true };
  let index = 0;
  let message: string[] = [];
  let args: Record<string, unknown>[] = [];
  const flush = () => {
    json[`message${index}`] = message.join(" ");
    json[`args${index}`] = args;
    index++;
    message = [];
    args = [];
  };
  for (const part of spec.parts) {
    if (typeof part === "string") {
      message.push(part.replace(/%/g, "%%"));
    } else if (part.kind === "statement") {
      if (message.length) flush();
      message = ["%1"];
      args = [argJson(part)];
      flush();
    } else {
      args.push(argJson(part));
      message.push(`%${args.length}`);
    }
  }
  if (message.length) flush();

  if (spec.shape === "hat") json.nextStatement = null;
  if (spec.shape === "statement") { json.previousStatement = null; json.nextStatement = null; }
  if (spec.shape === "cap") json.previousStatement = null;
  if (spec.shape === "reporter") json.output = null;
  if (spec.shape === "boolean") json.output = "Boolean";
  return json;
}

let registered = false;

/** Registriert alle Blöcke einmalig bei Blockly */
export function registerBlocks() {
  if (registered) return;
  registered = true;
  Blockly.common.defineBlocksWithJsonArray(BLOCKS.map(blocklyDefinition));

  // Kindgerechte Dialoge statt der grauen Browser-Fenster
  Blockly.dialog.setPrompt((message, defaultValue, callback) => {
    void askText(message, defaultValue).then(callback);
  });
  Blockly.dialog.setAlert((message, callback) => {
    void showMessage(message).then(() => callback?.());
  });
  Blockly.dialog.setConfirm((message, callback) => {
    void showMessage(message, true).then((ok) => callback(ok));
  });
}

// ----------------------------------------------------------------- Themes

function makeTheme(dark: boolean): Blockly.Theme {
  const blockStyles: Record<string, Partial<Blockly.Theme.BlockStyle>> = {};
  const categoryStyles: Record<string, Blockly.Theme.CategoryStyle> = {};
  for (const c of CATEGORIES) {
    blockStyles[`${c.id}_blocks`] = {
      colourPrimary: c.colour,
      colourSecondary: shade(c.colour, 0.45),
      colourTertiary: shade(c.colour, -0.38),
      hat: c.id === "events" ? "cap" : "",
    };
    categoryStyles[`${c.id}_category`] = { colour: c.colour };
  }
  // Eingebaute Zahlen-/Textfelder
  blockStyles.math_blocks = { colourPrimary: "#ffffff", colourSecondary: "#ffffff", colourTertiary: "#9a94b8" };
  blockStyles.text_blocks = { colourPrimary: "#ffffff", colourSecondary: "#ffffff", colourTertiary: "#9a94b8" };

  return Blockly.Theme.defineTheme(dark ? "codefunke-dark" : "codefunke-light", {
    name: dark ? "codefunke-dark" : "codefunke-light",
    base: Blockly.Themes.Classic,
    blockStyles: blockStyles as Record<string, Blockly.Theme.BlockStyle>,
    categoryStyles,
    componentStyles: dark
      ? {
          workspaceBackgroundColour: "#17153a", toolboxBackgroundColour: "#272456", toolboxForegroundColour: "#f4f1ff",
          flyoutBackgroundColour: "#312d68", flyoutForegroundColour: "#f4f1ff", flyoutOpacity: 0.97,
          scrollbarColour: "#9a94d6", scrollbarOpacity: 0.5, insertionMarkerColour: "#ffffff", insertionMarkerOpacity: 0.35,
          cursorColour: "#8ab8ff",
        }
      : {
          workspaceBackgroundColour: "#fffdf8", toolboxBackgroundColour: "#fff1dc", toolboxForegroundColour: "#1d1b3a",
          flyoutBackgroundColour: "#f7e6cc", flyoutForegroundColour: "#1d1b3a", flyoutOpacity: 0.97,
          scrollbarColour: "#1d1b3a", scrollbarOpacity: 0.3, insertionMarkerColour: "#1d1b3a", insertionMarkerOpacity: 0.3,
          cursorColour: "#2f6fe4",
        },
    fontStyle: { family: '"Fredoka Variable", Fredoka, ui-rounded, sans-serif', weight: "600", size: 13 },
    startHats: true,
  });
}

let themes: { light: Blockly.Theme; dark: Blockly.Theme } | undefined;

export function blocklyTheme(dark: boolean): Blockly.Theme {
  themes ??= { light: makeTheme(false), dark: makeTheme(true) };
  return dark ? themes.dark : themes.light;
}

// --------------------------------------------------------------- Toolbox

/** Standardwerte (Schatten-Blöcke) für die Eingaben eines Blocks in der Werkzeugkiste */
function toolboxInputs(spec: BlockSpec): Record<string, unknown> | undefined {
  const inputs: Record<string, unknown> = {};
  for (const arg of argsOf(spec)) {
    if (arg.kind === "number") inputs[arg.name] = { shadow: { type: "math_number", fields: { NUM: arg.default } } };
    if (arg.kind === "text") inputs[arg.name] = { shadow: { type: "text", fields: { TEXT: arg.default } } };
  }
  return Object.keys(inputs).length ? inputs : undefined;
}

export const VARIABLE_CATEGORY_KEY = "CF_VARIABLES";
const CREATE_VARIABLE_KEY = "CF_CREATE_VARIABLE";

/**
 * Baut die Werkzeugkiste. `allowed` schränkt die Blöcke ein (für Anfänger-
 * Aufgaben: nur das, was gebraucht wird – weniger Ablenkung).
 */
export function buildToolbox(allowed?: string[]): Blockly.utils.toolbox.ToolboxDefinition {
  const allow = allowed && allowed.length ? new Set(allowed) : undefined;
  const contents: Blockly.utils.toolbox.ToolboxItemInfo[] = [];
  for (const cat of CATEGORIES) {
    if (cat.id === "variables") {
      if (!allow || ["data_set", "data_change", "data_get"].some((t) => allow.has(t))) {
        contents.push({ kind: "category", name: cat.name, categorystyle: `${cat.id}_category`, custom: VARIABLE_CATEGORY_KEY });
      }
      continue;
    }
    const blocks = BLOCKS.filter((b) => b.category === cat.id && (!allow || allow.has(b.type)));
    if (!blocks.length) continue;
    contents.push({
      kind: "category",
      name: cat.name,
      categorystyle: `${cat.id}_category`,
      contents: blocks.map((b) => ({ kind: "block", type: b.type, inputs: toolboxInputs(b) }) as Blockly.utils.toolbox.BlockInfo),
    });
  }
  return { kind: "categoryToolbox", contents };
}

/** Variablen-Kategorie: "Variable erstellen" + Blöcke für jede Variable */
export function setupVariableCategory(ws: Blockly.WorkspaceSvg) {
  ws.registerButtonCallback(CREATE_VARIABLE_KEY, (button) => {
    Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace(), undefined, "");
  });
  ws.registerToolboxCategoryCallback(VARIABLE_CATEGORY_KEY, (workspace) => {
    const items: Blockly.utils.toolbox.FlyoutItemInfo[] = [
      { kind: "button", text: "＋ Variable erstellen", callbackkey: CREATE_VARIABLE_KEY } as Blockly.utils.toolbox.ButtonInfo,
    ];
    const vars = workspace.getVariableMap().getAllVariables().sort((a, b) => a.getName().localeCompare(b.getName()));
    if (vars.length === 0) {
      items.push({ kind: "label", text: "Erstelle zuerst eine Variable, z. B. „punkte“." } as Blockly.utils.toolbox.LabelInfo);
      return items;
    }
    for (const v of vars) items.push({ kind: "block", type: "data_get", fields: { VAR: { id: v.getId() } } } as Blockly.utils.toolbox.BlockInfo);
    const first = vars[0].getId();
    items.push(
      { kind: "block", type: "data_set", fields: { VAR: { id: first } }, inputs: { VALUE: { shadow: { type: "text", fields: { TEXT: "0" } } } } } as Blockly.utils.toolbox.BlockInfo,
      { kind: "block", type: "data_change", fields: { VAR: { id: first } }, inputs: { VALUE: { shadow: { type: "math_number", fields: { NUM: 1 } } } } } as Blockly.utils.toolbox.BlockInfo,
    );
    return items;
  });
}

export function categoryIdOf(type: string): CategoryId | undefined {
  return BLOCKS.find((b) => b.type === type)?.category;
}

export { Blockly };
