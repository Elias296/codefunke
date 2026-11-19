import { useMemo } from "react";
import { BlocksPreview } from "./BlocksPreview";
import { parseDsl } from "./dsl";
import { toPython } from "./pythonGen";
import { CodeBlock } from "../../components/ui/CodeBlock";

/** Blöcke links, derselbe Code als Python rechts – für den Übergang von Blöcken zu Text */
export default function BlocksWithPython({ source }: { source: string }) {
  const program = useMemo(() => parseDsl(source), [source]);
  const py = useMemo(() => toPython(program).replace(/^from funki import \*\n(import random\n)?\n?/, ""), [program]);
  return (
    <div className="grid items-start gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1 font-display text-sm font-semibold">Als Blöcke</p>
        <BlocksPreview program={program} source={source} />
      </div>
      <div>
        <p className="mb-1 font-display text-sm font-semibold">Als Python</p>
        <CodeBlock code={py.trim()} lang="python" />
      </div>
    </div>
  );
}
