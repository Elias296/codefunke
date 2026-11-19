import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Flag, Heart, Pencil, Shuffle } from "lucide-react";
import { getProject, reportProject, toggleLike, LANGUAGE_LABELS, LANGUAGE_COLORS, type ProjectFull } from "../features/projects/projects";
import { BlocksWorkbench } from "../features/blocks/BlocksWorkbench";
import type { SWorkspace } from "../features/blocks/blockSpecs";
import { CodeWorkbench } from "../features/code/CodeWorkbench";
import { useAuth } from "../stores/auth";
import { toast } from "../stores/toasts";
import { askText } from "../components/ui/dialog";
import { FunkiSays } from "../components/mascot/Funki";
import { PageLoading } from "../App";

/** Ein Projekt ansehen und ausprobieren (eigene oder aus der Galerie) */
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const user = useAuth((s) => s.user);
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId).then(setProject).catch((e) => setError((e as Error).message));
  }, [projectId]);

  const blocks = useMemo<SWorkspace | null>(() => {
    if (project?.language !== "blocks") return null;
    try { return JSON.parse(project.code) as SWorkspace; } catch { return { blocks: { languageVersion: 0, blocks: [] } }; }
  }, [project]);

  if (error) return <FunkiSays mood="oops" tone="error"><p className="font-bold">Projekt nicht gefunden</p><p>{error}</p><Link to="/projekte" className="cf-btn cf-btn-sm mt-2">Zur Galerie</Link></FunkiSays>;
  if (!project) return <PageLoading text="Projekt wird geladen …" />;

  const like = async () => {
    try {
      const r = await toggleLike(project.id);
      setProject({ ...project, likes: r.likes, likedByMe: r.likedByMe });
    } catch (e) {
      toast({ kind: "error", title: "Das hat nicht geklappt", text: (e as Error).message });
    }
  };
  const report = async () => {
    const reason = await askText("Was stimmt mit diesem Projekt nicht? (z. B. gemeine Wörter)", "");
    if (!reason) return;
    await reportProject(project.id, reason).then(
      () => toast({ kind: "success", title: "Danke für deine Meldung!", text: "Wir schauen uns das an." }),
      (e) => toast({ kind: "error", title: "Melden fehlgeschlagen", text: (e as Error).message }),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Brotkrumen" className="text-sm font-semibold text-muted">
        <Link to="/projekte" className="hover:underline">Projekte</Link> › <span aria-current="page">{project.title}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="cf-pill text-xs" style={{ background: LANGUAGE_COLORS[project.language], color: "var(--color-on-color)" }}>{LANGUAGE_LABELS[project.language]}</span>
          <h1 className="mt-2 text-4xl font-bold">{project.title}</h1>
          <p className="text-muted">
            {project.author ? <>von <strong>{project.author}</strong> · </> : null}
            {new Date(project.updatedAt).toLocaleDateString("de-DE")}
          </p>
          {project.description && <p className="mt-2 max-w-2xl">{project.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {project.isMine ? (
            <Link to={`/editor/${project.language}?projekt=${project.id}`} className="cf-btn cf-btn-primary"><Pencil size={18} aria-hidden="true" /> Bearbeiten</Link>
          ) : (
            <Link to={`/editor/${project.language}?projekt=${project.id}`} className="cf-btn cf-btn-primary"><Shuffle size={18} aria-hidden="true" /> Remixen</Link>
          )}
          {!project.isMine && !project.local && (
            <>
              <button type="button" className={`cf-btn ${project.likedByMe ? "cf-btn-danger" : ""}`} onClick={() => void like()} disabled={!user}
                aria-pressed={Boolean(project.likedByMe)} title={user ? "Gefällt mir" : "Zum Liken bitte anmelden"}>
                <Heart size={18} fill={project.likedByMe ? "currentColor" : "none"} aria-hidden="true" /> {project.likes ?? 0}
              </button>
              <button type="button" className="cf-btn cf-btn-ghost" onClick={() => void report()} disabled={!user} title={user ? "Projekt melden" : "Zum Melden bitte anmelden"}>
                <Flag size={18} aria-hidden="true" /> Melden
              </button>
            </>
          )}
        </div>
      </header>
      <p className="text-sm text-muted">Du kannst hier alles ausprobieren und ändern. Zum Speichern deiner Version klick auf „{project.isMine ? "Bearbeiten" : "Remixen"}“.</p>
      {blocks ? (
        <BlocksWorkbench initial={blocks} />
      ) : (
        <CodeWorkbench language={project.language as "python" | "web" | "lua" | "java"} initialCode={project.code} editorClassName="h-[420px]" />
      )}
    </div>
  );
}
