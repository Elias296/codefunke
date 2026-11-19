import { Link } from "react-router";
import { Funki } from "../components/mascot/Funki";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <Funki mood="oops" size={160} />
      <h1 className="text-3xl font-bold">Hoppla – diese Seite gibt es nicht</h1>
      <p className="text-muted">Funki hat überall gesucht, aber hier ist nichts. Vielleicht ein Tippfehler im Link?</p>
      <Link to="/" className="cf-btn cf-btn-primary">Zur Startseite</Link>
    </div>
  );
}
