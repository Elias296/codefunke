import { useEffect } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router";
import { Flame, FolderOpen, House, Map, Moon, SquareTerminal, Sun, User, type LucideIcon } from "lucide-react";
import { levelInfo, streakInfo, totalXp } from "@shared/progress.ts";
import { useProgress } from "../../features/progress/store";
import { resolveDark, useSettings } from "../../stores/settings";
import { useAuth } from "../../stores/auth";
import { Toasts } from "./Toasts";
import { ErrorBoundary } from "./ErrorBoundary";
import { Funki } from "../mascot/Funki";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Start", icon: House, end: true },
  { to: "/lernpfad", label: "Lernpfad", icon: Map },
  { to: "/editor", label: "Editor", icon: SquareTerminal },
  { to: "/projekte", label: "Projekte", icon: FolderOpen },
  { to: "/profil", label: "Profil", icon: User },
];

/** Grundgerüst jeder Seite: Kopfzeile, Inhalt, Tab-Leiste (Handy), Benachrichtigungen */
export function AppLayout() {
  const location = useLocation();
  const wide = /^\/(editor|lernpfad\/[^/]+\/[^/]+)/.test(location.pathname);

  // Beim Seitenwechsel nach oben scrollen und den Fokus auf den Inhalt setzen (Screenreader)
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("inhalt")?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#inhalt" className="sr-only-focusable fixed left-3 top-3 z-50 cf-btn cf-btn-sun">Zum Inhalt springen</a>
      <Header />
      <main id="inhalt" tabIndex={-1} className={`mx-auto w-full flex-1 px-4 pb-28 pt-6 outline-none md:px-6 md:pb-12 ${wide ? "max-w-[1600px]" : "max-w-6xl"}`}>
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="hidden border-t-2 border-line/20 py-6 text-center text-sm text-muted md:block">
        Codefunke – mit Funki programmieren lernen. Dein Code läuft sicher in deinem Browser.
      </footer>
      <MobileTabs />
      <Toasts />
    </div>
  );
}

function Header() {
  const xp = useProgress((s) => totalXp(s.data));
  const days = useProgress((s) => s.data.activityDays);
  const level = levelInfo(xp);
  const streak = streakInfo(days);
  const user = useAuth((s) => s.user);
  const offline = useAuth((s) => s.status === "offline");

  return (
    <header className="sticky top-0 z-40 border-b-[2.5px] border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-xl pr-2" aria-label="Codefunke – zur Startseite">
          <Funki size={46} />
          <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Code<span className="text-flame">funke</span>
          </span>
        </Link>

        <nav aria-label="Hauptnavigation" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 font-display font-semibold transition-colors ${
                  isActive ? "border-line bg-sun text-on-color shadow-[2px_2px_0_var(--cf-shadow)]" : "border-transparent hover:bg-surface-2"}`}>
              <n.icon size={18} strokeWidth={2.4} aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/profil" className="cf-pill bg-surface hover:bg-surface-2" title={`${xp} XP – ${level.title}`}>
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-line bg-sun text-xs text-on-color">{level.level}</span>
            <span className="hidden sm:inline">{xp} XP</span>
            <span className="sr-only">Level {level.level}, {xp} Erfahrungspunkte</span>
          </Link>
          <Link to="/profil" className={`cf-pill ${streak.activeToday ? "bg-flame text-on-color" : ""}`}
            title={streak.activeToday ? "Heute schon geübt!" : "Übe heute, um deine Serie zu halten"}>
            <Flame size={16} strokeWidth={2.6} aria-hidden="true" />
            {streak.current}
            <span className="sr-only"> Tage Lernserie</span>
          </Link>
          <ThemeToggle />
          {!user && !offline && (
            <Link to="/anmelden" className="cf-btn cf-btn-sm hidden lg:inline-flex">Anmelden</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const dark = resolveDark(theme);
  return (
    <button type="button" className="cf-btn cf-btn-sm !px-2.5" onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Hellen Modus einschalten" : "Dunklen Modus einschalten"} title={dark ? "Heller Modus" : "Dunkler Modus"}>
      {dark ? <Sun size={18} strokeWidth={2.4} aria-hidden="true" /> : <Moon size={18} strokeWidth={2.4} aria-hidden="true" />}
    </button>
  );
}

function MobileTabs() {
  return (
    <nav aria-label="Hauptnavigation (mobil)" className="fixed inset-x-0 bottom-0 z-40 border-t-[2.5px] border-line bg-surface md:hidden">
      <ul className="grid grid-cols-5">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-xs font-display font-semibold ${isActive ? "text-ink" : "text-muted"}`}>
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-12 place-items-center rounded-full border-2 ${isActive ? "border-line bg-sun text-on-color" : "border-transparent"}`}>
                    <n.icon size={20} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  {n.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
