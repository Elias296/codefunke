import { Link } from "react-router";
import { ArrowRight, Flame, Lock, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { levelInfo, streakInfo, totalXp } from "@shared/progress.ts";
import { badges, stages } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { chapterPath, nextStep, stageProgress, isStageUnlocked } from "../features/progress/unlock";
import { recommendations } from "../features/progress/recommend";
import { useAuth } from "../stores/auth";
import { Funki, FunkiSays } from "../components/mascot/Funki";
import { Icon } from "../components/ui/Icon";
import { ProgressBar, ProgressRing } from "../components/ui/ProgressRing";

export function HomePage() {
  const progress = useProgress((s) => s.data);
  const started = Object.keys(progress.completions).length > 0 || progress.lastVisited;
  return started ? <Dashboard /> : <Landing />;
}

function Landing() {
  const first = stages.find((s) => s.status === "verfuegbar")?.chapters[0];
  return (
    <div className="flex flex-col gap-14">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col items-start gap-5">
          <span className="cf-pill bg-sun text-on-color"><Sparkles size={14} aria-hidden="true" /> Kostenlos · ab 10 Jahren · ohne Vorwissen</span>
          <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl">
            Programmieren lernen – <span className="relative whitespace-nowrap text-flame">Schritt für Schritt<svg aria-hidden="true" viewBox="0 0 300 20" className="absolute -bottom-2 left-0 w-full"><path d="M4 14 Q 75 2 150 10 T 296 8" fill="none" stroke="var(--color-sun)" strokeWidth="7" strokeLinecap="round" /></svg></span>
          </h1>
          <p className="max-w-xl text-xl text-muted">
            Starte mit bunten Blöcken, lass Funki über die Bühne flitzen – und schreib bald echten Python-Code.
            Alles läuft direkt in deinem Browser.
          </p>
          <div className="flex flex-wrap gap-3">
            {first && <Link to={chapterPath(first)} className="cf-btn cf-btn-primary !px-6 !py-3 text-lg">Los geht’s! <ArrowRight aria-hidden="true" /></Link>}
            <Link to="/lernpfad" className="cf-btn !px-6 !py-3 text-lg">Lernpfad ansehen</Link>
          </div>
        </div>
        <div className="relative mx-auto">
          <div aria-hidden="true" className="absolute inset-6 -z-10 rotate-6 rounded-[2.5rem] border-[3px] border-line bg-sun" />
          <div aria-hidden="true" className="absolute inset-6 -z-10 -rotate-3 rounded-[2.5rem] border-[3px] border-line bg-mint" />
          <div className="cf-card flex flex-col items-center gap-2 p-8">
            <Funki mood="wave" size={230} float label="Funki, der kleine Drache, winkt dir zu" />
            <p className="font-display text-lg font-bold">Hi, ich bin Funki!</p>
            <p className="max-w-[16rem] text-center text-sm text-muted">Ich begleite dich – und helfe, wenn dein Code mal hakt.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="weg-titel" className="flex flex-col gap-5">
        <h2 id="weg-titel" className="text-3xl font-bold">Dein Weg in 6 Stufen</h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s) => (
            <li key={s.id} className="cf-card flex flex-col gap-2 p-4" style={{ borderTop: `8px solid ${s.color}` }}>
              <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-line text-on-color" style={{ background: s.color }}><Icon name={s.icon} /></span>
              <p className="font-display text-xs font-semibold text-muted">Stufe {s.order}</p>
              <p className="font-display text-lg font-bold leading-tight">{s.short}</p>
              {s.status === "bald" && <p className="text-xs text-muted">kommt bald</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: <Zap aria-hidden="true" />, title: "Sofort ausprobieren", text: "Code läuft direkt im Browser – nichts installieren.", color: "var(--color-sun)" },
          { icon: <ShieldCheck aria-hidden="true" />, title: "Hilfreiches Feedback", text: "„Dir fehlt ein Doppelpunkt in Zeile 3“ – statt kryptischer Fehler.", color: "var(--color-mint)" },
          { icon: <Trophy aria-hidden="true" />, title: "Level & Abzeichen", text: "Sammle XP, halte deine Lernserie und verdiene Abzeichen.", color: "var(--color-berry)" },
          { icon: <Sparkles aria-hidden="true" />, title: "Eigene Projekte", text: "Bau Spiele und Programme und teile sie in der Galerie.", color: "var(--color-grape)" },
        ].map((f) => (
          <div key={f.title} className="cf-card flex flex-col gap-2 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-line text-on-color" style={{ background: f.color }}>{f.icon}</span>
            <h3 className="text-lg font-bold">{f.title}</h3>
            <p className="text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Dashboard() {
  const progress = useProgress((s) => s.data);
  const user = useAuth((s) => s.user);
  const authStatus = useAuth((s) => s.status);
  const xp = totalXp(progress);
  const level = levelInfo(xp);
  const streak = streakInfo(progress.activityDays);
  const next = nextStep(stages, progress);
  const recs = recommendations(stages, progress);
  const recentBadges = Object.entries(progress.badges).sort((a, b) => b[1].localeCompare(a[1])).slice(0, 4)
    .map(([id]) => badges.find((b) => b.id === id)).filter(Boolean);

  let nextHref = "/lernpfad";
  let nextTitle = "Lernpfad ansehen";
  let nextText = "";
  if (next?.kind === "step" && next.chapter && next.step) {
    nextHref = chapterPath(next.chapter, next.step.id);
    nextTitle = `${next.chapter.title}: ${next.step.label}`;
    nextText = `${next.stage.title} · Kapitel ${next.stage.chapters.indexOf(next.chapter) + 1}`;
  } else if (next?.kind === "final") {
    nextHref = `/lernpfad/${next.stage.id}/abschlusstest`;
    nextTitle = `Abschlusstest: ${next.stage.short}`;
    nextText = "Alle Kapitel geschafft – jetzt den Test bestehen!";
  } else if (next?.kind === "done") {
    nextHref = "/editor";
    nextTitle = "Alles geschafft – bau etwas Eigenes!";
    nextText = "Neue Stufen kommen bald.";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <Funki mood="happy" size={90} />
        <div>
          <h1 className="text-4xl font-bold">Willkommen zurück{user ? `, ${user.username}` : ""}!</h1>
          <p className="text-lg text-muted">{streak.activeToday ? "Heute schon fleißig – super!" : "Schön, dass du da bist. Weiter geht’s!"}</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Link to={nextHref} className="cf-card group flex flex-col justify-between gap-4 p-6 lg:col-span-2" style={{ background: `color-mix(in srgb, ${next?.stage.color ?? "var(--color-sun)"} 26%, var(--cf-surface))` }}>
          <div>
            <p className="font-display font-semibold">Als Nächstes</p>
            <h2 className="mt-1 text-3xl font-bold">{nextTitle}</h2>
            {nextText && <p className="mt-1 text-muted">{nextText}</p>}
          </div>
          <span className="cf-btn cf-btn-primary self-start">Weiter lernen <ArrowRight size={18} aria-hidden="true" /></span>
        </Link>

        <div className="cf-card flex flex-col gap-3 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border-[2.5px] border-line bg-sun font-display text-2xl font-bold text-on-color">{level.level}</span>
            <div>
              <p className="font-display text-sm font-semibold text-muted">Level {level.level}</p>
              <p className="text-xl font-bold">{level.title}</p>
            </div>
          </div>
          <ProgressBar value={level.progress} label={`Fortschritt zu Level ${level.level + 1}`} />
          <p className="text-sm text-muted">{xp} XP · noch {level.xpForNext - level.xpIntoLevel} XP bis Level {level.level + 1}</p>
          <div className="flex items-center gap-2 rounded-xl border-2 border-line/30 p-3">
            <Flame className={streak.activeToday ? "text-flame" : "text-muted"} aria-hidden="true" />
            <p><strong>{streak.current} {streak.current === 1 ? "Tag" : "Tage"}</strong> Lernserie <span className="text-muted">(Rekord: {streak.longest})</span></p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="cf-card flex flex-col gap-3 p-6 lg:col-span-2" aria-labelledby="empf-titel">
          <h2 id="empf-titel" className="text-2xl font-bold">Funkis Empfehlungen</h2>
          {recs.length === 0 ? (
            <p className="text-muted">Alles im grünen Bereich! Mach einfach beim Lernpfad weiter.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {recs.map((r) => (
                <li key={r.id}>
                  <Link to={r.href} className="cf-card-flat flex h-full gap-3 p-4 hover:bg-surface-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface-2"><Icon name={r.icon} size={20} /></span>
                    <span>
                      <span className="block font-display font-bold">{r.title}</span>
                      <span className="text-sm text-muted">{r.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cf-card flex flex-col gap-3 p-6" aria-labelledby="abz-titel">
          <h2 id="abz-titel" className="text-2xl font-bold">Neue Abzeichen</h2>
          {recentBadges.length === 0 ? (
            <p className="text-muted">Löse deine erste Aufgabe für dein erstes Abzeichen!</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {recentBadges.map((b) => b && (
                <li key={b.id} className="flex flex-col items-center gap-1 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full border-[2.5px] border-line text-on-color shadow-[3px_3px_0_var(--cf-shadow)]" style={{ background: b.color }}><Icon name={b.icon} size={26} /></span>
                  <span className="font-display text-sm font-bold leading-tight">{b.title}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/profil" className="text-sm font-bold underline">Alle Abzeichen</Link>
        </section>
      </div>

      <section aria-labelledby="stufen-titel" className="flex flex-col gap-3">
        <h2 id="stufen-titel" className="text-2xl font-bold">Deine Stufen</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s) => {
            const sp = stageProgress(s, progress);
            const open = isStageUnlocked(s, stages, progress);
            return (
              <li key={s.id}>
                <Link to={`/lernpfad/${s.id}`} className="cf-card flex h-full flex-col items-center gap-2 p-4 text-center">
                  <ProgressRing value={sp.fraction} size={56} color={s.color} label={`${s.short}: ${Math.round(sp.fraction * 100)} Prozent`}>
                    {open || sp.passed ? <Icon name={s.icon} size={22} /> : <Lock size={18} aria-hidden="true" />}
                  </ProgressRing>
                  <span className="font-display font-bold leading-tight">{s.short}</span>
                  <span className="text-xs text-muted">{sp.passed ? "bestanden" : s.status === "bald" ? "kommt bald" : open ? `${Math.round(sp.fraction * 100)} %` : "gesperrt"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!user && authStatus !== "offline" && (
        <FunkiSays mood="think">
          <p className="font-display font-bold">Tipp: Leg ein Konto an!</p>
          <p className="text-sm">Dein Fortschritt ist gerade nur in diesem Browser gespeichert. Mit einem Konto geht nichts verloren und du kannst Projekte teilen.</p>
          <Link to="/registrieren" className="cf-btn cf-btn-sm mt-2">Konto erstellen</Link>
        </FunkiSays>
      )}
    </div>
  );
}
