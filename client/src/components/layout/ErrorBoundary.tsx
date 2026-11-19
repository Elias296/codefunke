import { Component, type ReactNode } from "react";
import { Funki } from "../mascot/Funki";

interface State {
  error: Error | null;
}

/**
 * Fängt Fehler in einem Seitenbereich ab, damit nie die ganze Seite leer wird.
 * Statt einer weißen Seite erscheint Funki mit einem "Nochmal versuchen"-Knopf.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Codefunke-Fehler:", error);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
        <Funki mood="oops" size={140} />
        <h1 className="text-3xl font-bold">Hoppla, da ist etwas schiefgegangen</h1>
        <p className="text-muted">Das ist nicht deine Schuld! Lade die Seite neu – dein Fortschritt ist gespeichert.</p>
        <div className="flex gap-2">
          <button type="button" className="cf-btn cf-btn-primary" onClick={() => this.setState({ error: null })}>Nochmal versuchen</button>
          <button type="button" className="cf-btn" onClick={() => window.location.reload()}>Seite neu laden</button>
        </div>
        <details className="text-left text-sm text-muted">
          <summary>Technische Details</summary>
          <pre className="whitespace-pre-wrap">{this.state.error.message}</pre>
        </details>
      </div>
    );
  }
}
