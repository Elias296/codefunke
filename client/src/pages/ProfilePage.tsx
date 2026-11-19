import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Download, Flame, LogOut, Trash2, Upload } from "lucide-react";
import { badgeProgress, levelInfo, localDay, mergeProgress, sanitizeProgress, streakInfo, totalXp } from "@shared/progress.ts";
import { STATIC_MODE } from "../lib/env";
import { badges } from "../content/loader";
import { useProgress } from "../features/progress/store";
import { useAuth } from "../stores/auth";
import { useSettings, type FontScale, type ThemeMode } from "../stores/settings";
import { toast } from "../stores/toasts";
import { Funki } from "../components/mascot/Funki";
import { Icon } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/ProgressRing";
import { askText } from "../components/ui/dialog";

export default function ProfilePage() {
  const progress = useProgress((s) => s.data);
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const xp = totalXp(progress);
  const level = levelInfo(xp);
  const streak = streakInfo(progress.activityDays);
  const earned = badges.filter((b) => progress.badges[b.id]);
  const tasks = Object.keys(progress.completions).filter((k) => k.startsWith("task:")).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="cf-card flex flex-col items-center gap-5 p-6 sm:flex-row">
        <Funki mood="happy" size={130} />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display font-semibold text-muted">{user ? "Angemeldet als" : "Du lernst als Gast"}</p>
          <h1 className="text-4xl font-bold">{user?.username ?? "Gast"}</h1>
          <p className="mt-1 text-lg"><strong>Level {level.level}</strong> · {level.title}</p>
          <div className="mt-3 max-w-md"><ProgressBar value={level.progress} label={`Fortschritt zu Level ${level.level + 1}`} /></div>
          <p className="mt-1 text-sm text-muted">{xp} XP · noch {level.xpForNext - level.xpIntoLevel} XP bis Level {level.level + 1}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[["Aufgaben", tasks], ["Abzeichen", earned.length], ["Serie", streak.current]].map(([label, value]) => (
            <div key={label} className="cf-card-flat px-4 py-3">
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="font-display text-2xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="cf-card flex flex-col gap-4 p-6" aria-labelledby="badges-titel">
          <h2 id="badges-titel" className="text-2xl font-bold">Abzeichen <span className="text-muted">({earned.length}/{badges.length})</span></h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {badges.map((b) => {
              const have = Boolean(progress.badges[b.id]);
              const [cur, need] = badgeProgress(progress, b.condition);
              return (
                <li key={b.id} className={`flex flex-col items-center gap-1.5 text-center ${have ? "" : "opacity-60"}`}>
                  <span className={`grid h-16 w-16 place-items-center rounded-full border-[2.5px] border-line ${have ? "text-on-color shadow-[3px_3px_0_var(--cf-shadow)]" : "border-dashed bg-surface-2 text-muted"}`}
                    style={have ? { background: b.color } : undefined}>
                    <Icon name={b.icon} size={28} />
                  </span>
                  <span className="font-display font-bold leading-tight">{b.title}</span>
                  <span className="text-xs text-muted">{b.description}</span>
                  {!have && need > 1 && <span className="text-xs font-semibold">{Math.min(cur, need)}/{need}</span>}
                  <span className="sr-only">{have ? "verdient" : "noch nicht verdient"}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <StreakCalendar days={progress.activityDays} longest={streak.longest} current={streak.current} />
          <SettingsCard />
          <AccountCard status={status} />
        </div>
      </div>
    </div>
  );
}

function StreakCalendar({ days, longest, current }: { days: string[]; longest: number; current: number }) {
  const set = new Set(days);
  const today = new Date();
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (27 - i));
    return { day: localDay(d), label: d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" }) };
  });
  return (
    <section className="cf-card flex flex-col gap-3 p-6" aria-labelledby="serie-titel">
      <h2 id="serie-titel" className="flex items-center gap-2 text-2xl font-bold"><Flame className="text-flame" aria-hidden="true" /> Lernserie</h2>
      <p><strong>{current}</strong> {current === 1 ? "Tag" : "Tage"} am Stück · Rekord: <strong>{longest}</strong></p>
      <ul className="grid grid-cols-7 gap-1.5" aria-label="Die letzten 4 Wochen">
        {cells.map((c) => (
          <li key={c.day} title={c.label} className={`aspect-square rounded-md border-2 ${set.has(c.day) ? "border-line bg-flame" : "border-line/20 bg-surface-2"}`}>
            <span className="sr-only">{c.label}: {set.has(c.day) ? "gelernt" : "nicht gelernt"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SettingsCard() {
  const s = useSettings();
  const radio = <T extends string>(name: string, value: T, current: T, set: (v: T) => void, label: string) => (
    <label key={value} className={`cursor-pointer rounded-xl border-[2.5px] px-3 py-1.5 font-display font-semibold ${current === value ? "border-line bg-sun text-on-color" : "border-line/30 hover:border-line"}`}>
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => set(value)} className="sr-only" />
      {label}
    </label>
  );
  return (
    <section className="cf-card flex flex-col gap-4 p-6" aria-labelledby="einst-titel">
      <h2 id="einst-titel" className="text-2xl font-bold">Einstellungen</h2>
      <fieldset>
        <legend className="cf-label">Farbmodus</legend>
        <div className="flex flex-wrap gap-2">
          {(["system", "light", "dark"] as ThemeMode[]).map((t) => radio("theme", t, s.theme, s.setTheme, t === "system" ? "Wie Gerät" : t === "light" ? "Hell" : "Dunkel"))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="cf-label">Schriftgröße</legend>
        <div className="flex flex-wrap gap-2">
          {(["klein", "normal", "gross", "riesig"] as FontScale[]).map((f) => radio("font", f, s.fontScale, s.setFontScale, { klein: "Klein", normal: "Normal", gross: "Groß", riesig: "Sehr groß" }[f]))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-flame)]" checked={s.readableFont} onChange={(e) => s.setReadableFont(e.target.checked)} />
        <span>Besonders gut lesbare Schrift</span>
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-flame)]" checked={s.reduceMotion} onChange={(e) => s.setReduceMotion(e.target.checked)} />
        <span>Weniger Animationen</span>
      </label>
    </section>
  );
}

function AccountCard({ status }: { status: string }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const progress = useProgress((s) => s.data);
  const reset = useProgress((s) => s.reset);
  const replace = useProgress((s) => s.replace);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "codefunke-fortschritt.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="cf-card flex flex-col gap-3 p-6" aria-labelledby="konto-titel">
      <h2 id="konto-titel" className="text-2xl font-bold">Konto & Daten</h2>
      {user ? (
        <>
          <p className="text-sm text-muted">Dein Fortschritt wird in deinem Konto gespeichert.</p>
          <button type="button" className="cf-btn" disabled={busy} onClick={async () => {
            setBusy(true);
            await logout();
            reset();
            setBusy(false);
            navigate("/");
          }}><LogOut size={18} aria-hidden="true" /> Abmelden</button>
          <button type="button" className="cf-btn cf-btn-ghost text-error" onClick={async () => {
            const pw = await askText("Konto wirklich löschen? Alle Projekte werden entfernt. Gib zur Bestätigung dein Passwort ein:", "");
            if (!pw) return;
            try {
              await deleteAccount(pw);
              reset();
              toast({ kind: "info", title: "Konto gelöscht", text: "Schade, dass du gehst! Du kannst jederzeit wiederkommen." });
              navigate("/");
            } catch (e) {
              toast({ kind: "error", title: "Löschen fehlgeschlagen", text: (e as Error).message });
            }
          }}><Trash2 size={18} aria-hidden="true" /> Konto löschen</button>
        </>
      ) : status === "offline" ? (
        <p className="text-sm text-muted">
          {STATIC_MODE
            ? "Diese Version läuft ohne Server: Dein Fortschritt wird in diesem Browser gespeichert. Mit „Herunterladen“ und „Laden“ nimmst du ihn auf ein anderes Gerät mit."
            : "Der Server ist nicht erreichbar – dein Fortschritt wird lokal in diesem Browser gespeichert."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">Ohne Konto bleibt dein Fortschritt nur in diesem Browser. Mit Konto ist er sicher gespeichert.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/registrieren" className="cf-btn cf-btn-primary">Konto erstellen</Link>
            <Link to="/anmelden" className="cf-btn">Anmelden</Link>
          </div>
        </>
      )}
      <hr className="border-line/15" />
      <button type="button" className="cf-btn cf-btn-sm" onClick={exportData}><Download size={16} aria-hidden="true" /> Fortschritt herunterladen</button>
      <label className="cf-btn cf-btn-sm cursor-pointer focus-within:outline focus-within:outline-3 focus-within:outline-focus">
        <Upload size={16} aria-hidden="true" /> Fortschritt laden
        <input type="file" accept="application/json,.json" className="sr-only" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const loaded = sanitizeProgress(JSON.parse(await file.text()));
            if (!loaded) throw new Error("Das ist keine Codefunke-Datei.");
            // Zusammenführen statt ersetzen – so geht nichts verloren
            replace(mergeProgress(progress, loaded));
            toast({ kind: "success", title: "Fortschritt geladen!", text: "Er wurde mit deinem bisherigen Fortschritt zusammengeführt." });
          } catch (err) {
            toast({ kind: "error", title: "Laden hat nicht geklappt", text: (err as Error).message });
          }
        }} />
      </label>
      {!user && (
        <button type="button" className="cf-btn cf-btn-sm cf-btn-ghost text-error" onClick={() => {
          if (window.confirm("Wirklich den ganzen Fortschritt in diesem Browser löschen?")) reset();
        }}><Trash2 size={16} aria-hidden="true" /> Fortschritt zurücksetzen</button>
      )}
    </section>
  );
}
