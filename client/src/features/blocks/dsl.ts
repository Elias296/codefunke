/**
 * Block-Schreibweise (DSL) – Block-Programme als einfacher Text.
 *
 * Beispiel:
 *   wenn_start
 *     stift_runter
 *     wiederhole 4
 *       gehe 100
 *       drehe_rechts 90
 *     falls (berührt_rand)
 *       sage "Au!"
 *     sonst
 *       gehe 10
 *     setze punkte 0
 *     ändere punkte (zufall 1 6)
 *
 * Regeln:
 *  - Jede Zeile ist ein Block: Schlüsselwort + Eingaben (siehe blockSpecs.ts → dsl).
 *  - Eingerückte Zeilen (2 Leerzeichen) gehören in den Block darüber
 *    (bei Startblöcken: das Programm darunter).
 *  - Zahlen: 10, -5, 2.5 · Texte: "in Anführungszeichen"
 *  - Wert-Blöcke in Klammern: (x), (zufall 1 10), (+ (var punkte) 1), (berührt_rand)
 *  - Ein einzelnes Wort an einer Zahl-/Text-Stelle ist eine Variable: gehe schritte
 *  - Zeilen mit # am Anfang sind Kommentare.
 */
import { argsOf, BLOCK_BY_DSL, BLOCK_BY_TYPE, type ArgSpec, type BlockSpec, type SBlock, type SWorkspace } from "./blockSpecs";

export class DslError extends Error {
  line: number;
  constructor(line: number, message: string) {
    super(`Zeile ${line}: ${message}`);
    this.line = line;
  }
}

type Token = { kind: "num"; value: number } | { kind: "str"; value: string } | { kind: "word"; value: string } | { kind: "open" } | { kind: "close" };

function tokenize(text: string, line: number): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { tokens.push({ kind: "open" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "close" }); i++; continue; }
    if (c === '"') {
      let s = "";
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\" && i + 1 < text.length) i++;
        s += text[i++];
      }
      if (text[i] !== '"') throw new DslError(line, "Anführungszeichen nicht geschlossen");
      i++;
      tokens.push({ kind: "str", value: s });
      continue;
    }
    let w = "";
    while (i < text.length && !/[\s()"]/.test(text[i])) w += text[i++];
    if (/^-?\d+(\.\d+)?$/.test(w)) tokens.push({ kind: "num", value: Number(w) });
    else tokens.push({ kind: "word", value: w });
  }
  return tokens;
}

interface Node {
  line: number;
  indent: number;
  tokens: Token[];
  children: Node[];
}

function buildTree(src: string): Node[] {
  const root: Node = { line: 0, indent: -1, tokens: [], children: [] };
  const stack: Node[] = [root];
  src.split(/\r?\n/).forEach((raw, idx) => {
    const lineNo = idx + 1;
    const expanded = raw.replace(/\t/g, "  ");
    const trimmed = expanded.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const indent = expanded.length - expanded.trimStart().length;
    const node: Node = { line: lineNo, indent, tokens: tokenize(trimmed, lineNo), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return root.children;
}

class Builder {
  private counter = 0;
  variables = new Map<string, string>();

  id(): string {
    return `b${++this.counter}`;
  }

  variable(name: string): { id: string } {
    if (!this.variables.has(name)) this.variables.set(name, `v_${name}`);
    return { id: this.variables.get(name)! };
  }

  /** Wandelt eine Liste von Zeilen in eine Block-Kette um */
  chain(nodes: Node[]): SBlock | undefined {
    const blocks: SBlock[] = [];
    for (const node of nodes) {
      const first = node.tokens[0];
      if (first?.kind === "word" && first.value === "sonst") {
        const prev = blocks[blocks.length - 1];
        if (!prev || prev.type !== "control_if") throw new DslError(node.line, '"sonst" muss direkt nach einem "falls" kommen');
        prev.type = "control_if_else";
        const elseChain = this.chain(node.children);
        if (elseChain) prev.inputs = { ...prev.inputs, ELSE: { block: elseChain } };
        continue;
      }
      blocks.push(this.statement(node));
    }
    for (let i = blocks.length - 2; i >= 0; i--) blocks[i].next = { block: blocks[i + 1] };
    return blocks[0];
  }

  statement(node: Node): SBlock {
    const [head, ...rest] = node.tokens;
    if (!head || head.kind !== "word") throw new DslError(node.line, "Zeile muss mit einem Block-Namen beginnen");
    const spec = BLOCK_BY_DSL[head.value];
    if (!spec) throw new DslError(node.line, `unbekannter Block "${head.value}"`);
    if (spec.shape === "reporter" || spec.shape === "boolean") throw new DslError(node.line, `"${head.value}" ist ein Wert-Block und gehört in Klammern`);
    const block = this.fill(spec, rest, node.line);

    const statements = argsOf(spec).filter((a) => a.kind === "statement");
    if (spec.shape === "hat") {
      const body = this.chain(node.children);
      if (body) block.next = { block: body };
    } else if (statements.length > 0) {
      const body = this.chain(node.children);
      if (body) block.inputs = { ...block.inputs, [statements[0].name]: { block: body } };
    } else if (node.children.length > 0) {
      throw new DslError(node.line, `in "${head.value}" kann man keine Blöcke hineinstecken (Einrückung prüfen)`);
    }
    return block;
  }

  /** Füllt die Eingaben eines Blocks aus den Token */
  fill(spec: BlockSpec, tokens: Token[], line: number): SBlock {
    const block: SBlock = { type: spec.type, id: this.id() };
    const pos = { i: 0 };
    for (const arg of argsOf(spec)) {
      if (arg.kind === "statement") continue;
      if (pos.i >= tokens.length) {
        if (arg.kind === "boolean") continue;
        if (arg.kind === "variable" || arg.kind === "dropdown") throw new DslError(line, `bei "${spec.dsl}" fehlt die Eingabe ${arg.name}`);
        this.setValue(block, arg, undefined, line);
        continue;
      }
      if (arg.kind === "dropdown") {
        const t = tokens[pos.i++];
        const value = t.kind === "word" || t.kind === "str" ? t.value : t.kind === "num" ? String(t.value) : "";
        if (!arg.options.some(([, v]) => v === value)) {
          throw new DslError(line, `"${value}" ist bei "${spec.dsl}" nicht erlaubt (möglich: ${arg.options.map(([, v]) => v).join(", ")})`);
        }
        block.fields = { ...block.fields, [arg.name]: value };
      } else if (arg.kind === "variable") {
        const t = tokens[pos.i++];
        if (t.kind !== "word") throw new DslError(line, `bei "${spec.dsl}" muss ein Variablen-Name stehen`);
        block.fields = { ...block.fields, [arg.name]: this.variable(t.value) };
      } else {
        this.setValue(block, arg, this.expression(tokens, pos, line), line);
      }
    }
    if (pos.i < tokens.length) throw new DslError(line, `zu viele Eingaben bei "${spec.dsl}"`);
    return block;
  }

  setValue(block: SBlock, arg: ArgSpec, value: SBlock | Token | undefined, line: number) {
    let shadow: SBlock | undefined;
    if (arg.kind === "number") shadow = { type: "math_number", id: this.id(), fields: { NUM: arg.default } };
    if (arg.kind === "text") shadow = { type: "text", id: this.id(), fields: { TEXT: arg.default } };
    const input: { block?: SBlock; shadow?: SBlock } = {};
    if (value && "type" in value) {
      input.block = value;
      if (shadow) input.shadow = shadow;
    } else if (value) {
      const literal = value.kind === "num" ? value.value : value.kind === "str" ? value.value : undefined;
      if (literal === undefined) throw new DslError(line, "unerwartetes Zeichen");
      if (arg.kind === "boolean") throw new DslError(line, `an Stelle ${arg.name} gehört eine Bedingung in Klammern`);
      if (arg.kind === "number" && typeof literal === "number") shadow = { type: "math_number", id: this.id(), fields: { NUM: literal } };
      else shadow = { type: "text", id: this.id(), fields: { TEXT: String(literal) } };
      input.shadow = shadow;
    } else if (shadow) {
      input.shadow = shadow;
    }
    if (input.block || input.shadow) block.inputs = { ...block.inputs, [arg.name]: input };
  }

  /** Liest einen Wert: Zahl, Text, Variable oder (Wert-Block …) */
  expression(tokens: Token[], pos: { i: number }, line: number): SBlock | Token {
    const t = tokens[pos.i++];
    if (!t) throw new DslError(line, "Wert fehlt");
    if (t.kind === "num" || t.kind === "str") return t;
    if (t.kind === "word") {
      return { type: "data_get", id: this.id(), fields: { VAR: this.variable(t.value) } };
    }
    if (t.kind === "close") throw new DslError(line, "unerwartete schließende Klammer");
    const head = tokens[pos.i++];
    if (!head || head.kind !== "word") throw new DslError(line, "nach ( muss ein Block-Name kommen");
    const spec = BLOCK_BY_DSL[head.value];
    if (!spec) throw new DslError(line, `unbekannter Wert-Block "${head.value}"`);
    if (spec.shape !== "reporter" && spec.shape !== "boolean") throw new DslError(line, `"${head.value}" ist kein Wert-Block`);
    // Token bis zur passenden Klammer sammeln
    let depth = 1;
    const inner: Token[] = [];
    while (pos.i < tokens.length) {
      const x = tokens[pos.i++];
      if (x.kind === "open") depth++;
      if (x.kind === "close" && --depth === 0) break;
      inner.push(x);
    }
    if (depth !== 0) throw new DslError(line, "Klammer nicht geschlossen");
    return this.fill(spec, inner, line);
  }
}

/** Wandelt Block-Text in das Blockly-JSON-Format um */
export function parseDsl(src: string): SWorkspace {
  const builder = new Builder();
  const tree = buildTree(src);
  const stacks: SBlock[] = [];
  let loose: Node[] = [];
  const flushLoose = () => {
    if (loose.length) {
      const chain = builder.chain(loose);
      if (chain) stacks.push(chain);
      loose = [];
    }
  };
  for (const node of tree) {
    const head = node.tokens[0];
    const spec = head?.kind === "word" ? BLOCK_BY_DSL[head.value] : undefined;
    if (spec?.shape === "hat") {
      flushLoose();
      stacks.push(builder.statement(node));
    } else {
      loose.push(node);
    }
  }
  flushLoose();

  // Stapel untereinander anordnen (grobe Höhe pro Block)
  let y = 24;
  for (const s of stacks) {
    s.x = 24;
    s.y = y;
    y += 70 + countLines(s) * 52;
  }
  return {
    blocks: { languageVersion: 0, blocks: stacks },
    variables: [...builder.variables.entries()].map(([name, id]) => ({ name, id })),
  };
}

function countLines(b: SBlock | undefined): number {
  let n = 0;
  for (let cur = b; cur; cur = cur.next?.block) {
    n++;
    for (const input of Object.values(cur.inputs ?? {})) {
      const spec = BLOCK_BY_TYPE[cur.type];
      if (input.block && spec && BLOCK_BY_TYPE[input.block.type]?.shape !== "reporter" && BLOCK_BY_TYPE[input.block.type]?.shape !== "boolean") {
        n += countLines(input.block) + 1;
      }
    }
  }
  return n;
}

// --------------------------------------------------------- JSON → Text ----

/** Wandelt Blockly-JSON zurück in Block-Text (praktisch zum Schreiben neuer Aufgaben) */
export function toDsl(ws: SWorkspace): string {
  const varNames = new Map((ws.variables ?? []).map((v) => [v.id, v.name]));
  const lines: string[] = [];

  const valueOf = (input?: { block?: SBlock; shadow?: SBlock }): string => {
    const b = input?.block ?? input?.shadow;
    if (!b) return "";
    if (b.type === "math_number") return String(b.fields?.NUM ?? 0);
    if (b.type === "text") return JSON.stringify(String(b.fields?.TEXT ?? ""));
    if (b.type === "data_get") return nameOf(b.fields?.VAR);
    return `(${head(b)})`;
  };
  const nameOf = (field: unknown): string => {
    if (field && typeof field === "object" && "id" in field) return varNames.get((field as { id: string }).id) ?? "variable";
    return String(field ?? "variable");
  };
  const head = (b: SBlock): string => {
    const spec = BLOCK_BY_TYPE[b.type];
    if (!spec) return `# unbekannt: ${b.type}`;
    const parts = [spec.dsl];
    for (const arg of argsOf(spec)) {
      if (arg.kind === "statement") continue;
      if (arg.kind === "dropdown") parts.push(String(b.fields?.[arg.name] ?? arg.options[0][1]));
      else if (arg.kind === "variable") parts.push(nameOf(b.fields?.[arg.name]));
      else {
        const v = valueOf(b.inputs?.[arg.name]);
        if (v) parts.push(v);
      }
    }
    return parts.join(" ");
  };
  const emit = (b: SBlock | undefined, indent: number) => {
    for (let cur = b; cur; cur = cur.next?.block) {
      const spec = BLOCK_BY_TYPE[cur.type];
      const pad = "  ".repeat(indent);
      if (cur.type === "control_if_else") {
        lines.push(pad + head({ ...cur, type: "control_if" }));
        emit(cur.inputs?.DO?.block, indent + 1);
        lines.push(`${pad}sonst`);
        emit(cur.inputs?.ELSE?.block, indent + 1);
        continue;
      }
      lines.push(pad + head(cur));
      if (spec?.shape === "hat") {
        emit(cur.next?.block, indent + 1);
        return;
      }
      for (const arg of spec ? argsOf(spec) : []) {
        if (arg.kind === "statement") emit(cur.inputs?.[arg.name]?.block, indent + 1);
      }
    }
  };
  for (const top of ws.blocks?.blocks ?? []) {
    emit(top, 0);
    lines.push("");
  }
  return lines.join("\n").trim();
}
