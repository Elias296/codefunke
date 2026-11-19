import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Save, FilePlus2, Blocks, Code2, Globe, Moon, Coffee } from "lucide-react";
import { BlocksWorkbench, type BlocksWorkbenchHandle } from "../features/blocks/BlocksWorkbench";
import { parseDsl } from "../features/blocks/dsl";
import type { SWorkspace } from "../features/blocks/blockSpecs";
import { CodeWorkbench, type WorkbenchHandle } from "../features/code/CodeWorkbench";
import { WEB_STARTER } from "../features/runners/web/buildDocument";
import { JAVA_STARTER } from "../features/runners/java/javaRunner";
import { getProject, saveProject, type ProjectFull, type ProjectLanguage } from "../features/projects/projects";
import { loadDraft, saveDraft, clearDraft } from "../features/lesson/drafts";
import { askText } from "../components/ui/dialog";
import { toast } from "../stores/toasts";
import { PageLoading } from "../App";

const LANGS: { id: ProjectLanguage; label: string; icon: typeof Blocks }[] = [
  { id: "blocks", label: "Blöcke", icon: Blocks },
  { id: "python", label: "Python", icon: Code2 },
  { id: "web", label: "HTML/CSS/JS", icon: Globe },
  { id: "lua", label: "Lua", icon: Moon },
  { id: "java", label: "Java", icon: Coffee },
];

const STARTERS: Record<ProjectLanguage, string> = {
  blocks: JSON.stringify(parseDsl('wenn_start\n  sage_für "Hallo! Bau etwas Tolles!" 2\n  wiederhole 4\n    gehe 50\n    drehe_rechts 90')),
  python: 'name = input("Wie heißt du? ")\nprint("Hallo " + name + "! Schön, dass du da bist.")\n',
  web: JSON.stringify(WEB_STARTER),
  lua: 'print("Hallo aus Lua!")\n\nfor i = 1, 3 do\n  print("Runde " .. i)\nend\n',
  java: JAVA_STARTER,
};

function isLang(v: string | undefined): v is ProjectLanguage {
  return LANGS.some((l) => l.id === v);
}

/** Freier Editor: einfach drauflos programmieren und Projekte speichern */
export default function EditorPage() {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const lang: ProjectLanguage = isLang(params.lang) ? params.lang : "blocks";
  const projectId = search.get("projekt");
  const codeParam = search.get("code");
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [version, setVersion] = useState(0);
  const blocksRef = useRef<BlocksWorkbenchHandle>(null);
  const codeRef = useRef<WorkbenchHandle>(null);
  const draftKey = `editor:${lang}`;

  // Projekt laden (eigenes = bearbeiten, fremdes = Remix)
  useEffect(() => {
    if (!projectId) { setProject(null); return; }
    setLoading(true);
    getProject(projectId)
      .then((p) => {
        setProject(p);
        if (p.language !== lang) navigate(`/editor/${p.language}?projekt=${p.id}`, { replace: true });
        setVersion((v) => v + 1);
      })
      .catch((e) => toast({ kind: "error", title: "Projekt nicht gefunden", text: (e as Error).message }))
      .finally(() => setLoading(false));
  }, [projectId, lang, navigate]);

  // Code aus "Ausprobieren" in Lektionen übernehmen
  useEffect(() => {
    if (codeParam !== null) {
      saveDraft(draftKey, codeParam);
      setSearch({}, { replace: true });
      setVersion((v) => v + 1);
    }
  }, [codeParam, draftKey, setSearch]);

  const initialCode = useMemo(() => {
    if (project && project.language === lang) return project.code;
    if (codeParam !== null) return codeParam;
    return loadDraft<string>(draftKey) ?? STARTERS[lang];
    // version erzwingt Neuberechnung nach dem Laden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, lang, draftKey, version, codeParam]);

  const initialBlocks = useMemo<SWorkspace>(() => {
    try { return JSON.parse(initialCode) as SWorkspace; } catch { return parseDsl("wenn_start"); }
  }, [initialCode]);

  const currentCode = () => (lang === "blocks" ? JSON.stringify(blocksRef.current?.getProgram() ?? initialBlocks) : codeRef.current?.getCode() ?? initialCode);
  const isMine = Boolean(project?.isMine);

  const save = async (asNew = false) => {
    const title = asNew || !isMine ? await askText("Wie soll dein Projekt heißen?", project ? (isMine ? project.title : `${project.title} (Remix)`) : "Mein Projekt") : project!.title;
    if (!title) return;
    try {
      const saved = await saveProject({
        id: isMine && !asNew ? project!.id : undefined, title, description: project?.description ?? "", language: lang, code: currentCode(),
        isPublic: isMine && !asNew ? project!.isPublic : false, remixOf: !isMine && project ? project.id : null,
      });
      setProject(saved);
      setSearch({ projekt: saved.id }, { replace: true });
      if (!project || !isMine) clearDraft(draftKey);
      toast({ kind: "success", title: "Gespeichert!", text: saved.local ? "Auf diesem Gerät gespeichert. Mit Konto kannst du es auch teilen." : "Zu finden unter „Projekte“." });
    } catch (e) {
      toast({ kind: "error", title: "Speichern hat nicht geklappt", text: (e as Error).message });
    }
  };

  const newProject = () => {
    if (!window.confirm("Neues Projekt beginnen? Nicht gespeicherte Änderungen gehen verloren.")) return;
    clearDraft(draftKey);
    setProject(null);
    setSearch({}, { replace: true });
    setVersion((v) => v + 1);
  };

  const actions = (
    <>
      <button type="button" className="cf-btn cf-btn-sun" onClick={() => void save()}>
        <Save size={18} aria-hidden="true" /> {isMine ? "Speichern" : project ? "Als Remix speichern" : "Speichern"}
      </button>
      <button type="button" className="cf-btn cf-btn-sm" onClick={newProject}><FilePlus2 size={16} aria-hidden="true" /> Neu</button>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Editor</h1>
          <p className="text-muted">
            {project ? (
              <>{isMine ? "Du bearbeitest" : "Remix von"} <strong>„{project.title}“</strong>{!isMine && project.author ? ` von ${project.author}` : ""}</>
            ) : "Programmier, was du willst! Dein Zwischenstand wird automatisch im Browser gemerkt."}
          </p>
        </div>
        <Link to="/projekte" className="text-sm font-bold underline">Meine Projekte</Link>
      </header>

      <nav aria-label="Sprache wählen" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex min-w-max gap-2">
          {LANGS.map((l) => (
            <li key={l.id}>
              <Link to={`/editor/${l.id}`} aria-current={l.id === lang ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl border-[2.5px] px-3 py-2 font-display font-semibold ${l.id === lang ? "border-line bg-sun text-on-color shadow-[3px_3px_0_var(--cf-shadow)]" : "border-line/30 bg-surface hover:border-line"}`}>
                <l.icon size={18} aria-hidden="true" /> {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {loading ? (
        <PageLoading text="Projekt wird geladen …" />
      ) : lang === "blocks" ? (
        <BlocksWorkbench key={`blocks-${version}-${project?.id ?? ""}`} ref={blocksRef} initial={initialBlocks}
          onChange={(ws) => { if (!project) saveDraft(draftKey, JSON.stringify(ws)); }} actions={actions} editorHeight="h-[620px]" />
      ) : (
        <CodeWorkbench key={`${lang}-${version}-${project?.id ?? ""}`} ref={codeRef} language={lang} initialCode={initialCode}
          onChange={(c) => { if (!project) saveDraft(draftKey, c); }} actions={actions} editorClassName="h-[460px]" />
      )}
    </div>
  );
}
