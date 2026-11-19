import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Globe2, Heart, Lock, Plus, Search, Share2, Trash2 } from "lucide-react";
import { deleteProject, listMyProjects, listPublicProjects, setShared, LANGUAGE_COLORS, LANGUAGE_LABELS, type ProjectSummary } from "../features/projects/projects";
import { useAuth } from "../stores/auth";
import { toast } from "../stores/toasts";
import { Funki, FunkiSays } from "../components/mascot/Funki";
import { STATIC_MODE } from "../lib/env";

type Tab = "entdecken" | "meine";

export default function ProjectsPage() {
  const [tab, setTab] = useState<Tab>(STATIC_MODE ? "meine" : "entdecken");
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Projekte</h1>
          <p className="text-lg text-muted">Entdecke, was andere gebaut haben – und zeig deine eigenen Programme.</p>
        </div>
        <Link to="/editor" className="cf-btn cf-btn-primary"><Plus size={18} aria-hidden="true" /> Neues Projekt</Link>
      </header>
      <div role="tablist" aria-label="Projekte" className="flex gap-2">
        {(["entdecken", "meine"] as Tab[]).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-xl border-[2.5px] px-4 py-2 font-display font-semibold ${tab === t ? "border-line bg-sun text-on-color shadow-[3px_3px_0_var(--cf-shadow)]" : "border-line/30 bg-surface hover:border-line"}`}>
            {t === "entdecken" ? "Galerie entdecken" : "Meine Projekte"}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "entdecken" ? <PublicGallery /> : <MyProjects />}</div>
    </div>
  );
}

function PublicGallery() {
  if (STATIC_MODE) {
    return (
      <FunkiSays mood="think">
        <p className="font-display font-bold">Die gemeinsame Galerie gibt es nur mit Server</p>
        <p>Diese Version von Codefunke läuft ohne Server – deshalb kann man hier keine Projekte mit anderen teilen. Deine eigenen Projekte findest du unter „Meine Projekte“.</p>
      </FunkiSays>
    );
  }
  return <PublicGalleryList />;
}

function PublicGalleryList() {
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState<"neu" | "beliebt">("neu");
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      listPublicProjects({ q, language, sort }).then((p) => { setItems(p); setError(null); }).catch((e) => setError((e as Error).message));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, language, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Projekte suchen</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="cf-input !pl-10" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Sprache</span>
          <select className="cf-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Alle Sprachen</option>
            {Object.entries(LANGUAGE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Sortierung</span>
          <select className="cf-input" value={sort} onChange={(e) => setSort(e.target.value as "neu" | "beliebt")}>
            <option value="neu">Neueste zuerst</option>
            <option value="beliebt">Beliebteste zuerst</option>
          </select>
        </label>
      </div>
      {error ? (
        <FunkiSays mood="oops" tone="warn"><p>{error}</p></FunkiSays>
      ) : items === null ? (
        <p className="text-muted" role="status">Lädt …</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Funki mood="think" size={120} />
          <p className="text-lg">Hier ist noch nichts. Sei die erste Person, die ein Projekt teilt!</p>
        </div>
      ) : (
        <ProjectGrid items={items} />
      )}
    </div>
  );
}

function MyProjects() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const reload = () => listMyProjects().then(setItems).catch((e) => { toast({ kind: "error", title: "Laden fehlgeschlagen", text: (e as Error).message }); setItems([]); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, [user]);

  const remove = async (p: ProjectSummary) => {
    if (!window.confirm(`„${p.title}“ wirklich löschen?`)) return;
    await deleteProject(p.id).catch((e) => toast({ kind: "error", title: "Löschen fehlgeschlagen", text: (e as Error).message }));
    void reload();
  };
  const share = async (p: ProjectSummary) => {
    try {
      await setShared(p.id, !p.isPublic);
      toast({ kind: "success", title: p.isPublic ? "Nicht mehr geteilt" : "Geteilt!", text: p.isPublic ? undefined : "Dein Projekt ist jetzt in der Galerie." });
      void reload();
    } catch (e) {
      toast({ kind: "error", title: "Teilen fehlgeschlagen", text: (e as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!user && !STATIC_MODE && (
        <FunkiSays mood="think">
          <p>Deine Projekte sind gerade nur in diesem Browser gespeichert. <Link to="/registrieren" className="font-bold underline">Mit einem Konto</Link> kannst du sie überall öffnen und teilen.</p>
        </FunkiSays>
      )}
      {items === null ? <p role="status" className="text-muted">Lädt …</p> : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Funki mood="happy" size={120} />
          <p className="text-lg">Noch keine Projekte. Leg im Editor los!</p>
          <Link to="/editor" className="cf-btn cf-btn-primary">Zum Editor</Link>
        </div>
      ) : (
        <ProjectGrid items={items} renderActions={(p) => (
          <>
            {!p.local && (
              <button type="button" className="cf-btn cf-btn-sm" onClick={() => void share(p)} aria-label={p.isPublic ? `„${p.title}“ nicht mehr teilen` : `„${p.title}“ in der Galerie teilen`}>
                {p.isPublic ? <Lock size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />} {p.isPublic ? "Privat" : "Teilen"}
              </button>
            )}
            <button type="button" className="cf-btn cf-btn-sm cf-btn-ghost" onClick={() => void remove(p)} aria-label={`„${p.title}“ löschen`}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </>
        )} />
      )}
    </div>
  );
}

function ProjectGrid({ items, renderActions }: { items: ProjectSummary[]; renderActions?: (p: ProjectSummary) => React.ReactNode }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li key={p.id} className="cf-card flex flex-col overflow-hidden">
          <div className="h-3" style={{ background: LANGUAGE_COLORS[p.language] }} aria-hidden="true" />
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="cf-pill text-xs" style={{ background: LANGUAGE_COLORS[p.language], color: "var(--color-on-color)" }}>{LANGUAGE_LABELS[p.language]}</span>
              {p.local && <span className="cf-pill text-xs">nur auf diesem Gerät</span>}
              {p.isPublic && <span className="cf-pill text-xs"><Globe2 size={12} aria-hidden="true" /> geteilt</span>}
            </div>
            <h2 className="text-xl font-bold">
              <Link to={`/projekte/${p.id}`} className="hover:underline">{p.title}</Link>
            </h2>
            {p.description && <p className="line-clamp-2 text-sm text-muted">{p.description}</p>}
            <p className="mt-auto flex items-center gap-3 text-sm text-muted">
              {p.author && <span>von <strong>{p.author}</strong></span>}
              {p.likes !== undefined && <span className="inline-flex items-center gap-1"><Heart size={14} aria-hidden="true" /> {p.likes}</span>}
              <span>{new Date(p.updatedAt).toLocaleDateString("de-DE")}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/projekte/${p.id}`} className="cf-btn cf-btn-sm">Öffnen</Link>
              {renderActions?.(p)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
