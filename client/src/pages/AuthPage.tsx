import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../stores/auth";
import { useProgress } from "../features/progress/store";
import { Funki, FunkiSays } from "../components/mascot/Funki";
import { STATIC_MODE } from "../lib/env";

/** Anmelden und Registrieren – nur Benutzername + Passwort, keine E-Mail (Datensparsamkeit für Kinder) */
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const status = useAuth((s) => s.status);
  const pull = useProgress((s) => s.pullFromServer);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  if (STATIC_MODE) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <FunkiSays mood="think">
          <p className="font-display text-lg font-bold">Hier brauchst du kein Konto!</p>
          <p>Diese Version von Codefunke läuft ohne Server. Dein Fortschritt und deine Projekte werden automatisch in diesem Browser gespeichert.</p>
          <p className="mt-2 text-sm">Tipp: Unter <Link to="/profil" className="font-bold underline">Profil</Link> kannst du deinen Fortschritt herunterladen und auf einem anderen Gerät wieder laden.</p>
        </FunkiSays>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegister && password !== password2) return setError("Die beiden Passwörter sind nicht gleich.");
    setBusy(true);
    try {
      await (isRegister ? register(username.trim(), password) : login(username.trim(), password));
      await pull().catch(() => undefined);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-4xl items-center gap-8 md:grid-cols-2">
      <div className="hidden flex-col items-center gap-3 text-center md:flex">
        <Funki mood={isRegister ? "wave" : "happy"} size={220} float />
        <p className="font-display text-xl font-bold">{isRegister ? "Schön, dass du mitmachst!" : "Willkommen zurück!"}</p>
        <p className="text-muted">Mit einem Konto wird dein Fortschritt gespeichert – auf jedem Gerät.</p>
      </div>
      <form onSubmit={submit} className="cf-card flex flex-col gap-4 p-6 sm:p-8" noValidate>
        <h1 className="text-3xl font-bold">{isRegister ? "Konto erstellen" : "Anmelden"}</h1>
        {status === "offline" && <p className="rounded-xl bg-warn-bg p-3 text-sm">Der Server ist gerade nicht erreichbar. Anmelden geht im Moment nicht.</p>}
        <div>
          <label htmlFor="username" className="cf-label">Benutzername</label>
          <input id="username" className="cf-input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)}
            required minLength={3} maxLength={20} aria-describedby={isRegister ? "username-hint" : undefined} />
          {isRegister && <p id="username-hint" className="mt-1 text-sm text-muted">3–20 Zeichen. Bitte nicht deinen echten Namen – denk dir einen Spitznamen aus, z. B. „FunkenFlo42“.</p>}
        </div>
        <div>
          <label htmlFor="password" className="cf-label">Passwort</label>
          <div className="relative">
            <input id="password" className="cf-input !pr-12" type={show ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} aria-describedby={isRegister ? "pw-hint" : undefined} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 hover:bg-surface-2"
              aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}>
              {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
          {isRegister && <p id="pw-hint" className="mt-1 text-sm text-muted">Mindestens 8 Zeichen. Tipp: Ein Satz wie „DracheFliegt7Mal!“ ist leicht zu merken.</p>}
        </div>
        {isRegister && (
          <div>
            <label htmlFor="password2" className="cf-label">Passwort wiederholen</label>
            <input id="password2" className="cf-input" type={show ? "text" : "password"} autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
          </div>
        )}
        {error && <p role="alert" className="rounded-xl border-2 border-error bg-error-bg p-3 font-semibold text-error">{error}</p>}
        <button type="submit" className="cf-btn cf-btn-primary" disabled={busy || status === "offline"}>
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} {isRegister ? "Konto erstellen" : "Anmelden"}
        </button>
        <p className="text-sm">
          {isRegister ? <>Schon ein Konto? <Link to="/anmelden" className="font-bold underline">Anmelden</Link></> : <>Noch kein Konto? <Link to="/registrieren" className="font-bold underline">Konto erstellen</Link></>}
        </p>
        {isRegister && <p className="text-xs text-muted">Dein bisheriger Fortschritt aus diesem Browser wird automatisch übernommen. Wir speichern nur Benutzername, Passwort (verschlüsselt), Fortschritt und deine Projekte.</p>}
      </form>
    </div>
  );
}
