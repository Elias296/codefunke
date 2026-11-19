import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { Funki } from "./components/mascot/Funki";
import { applySettings, useSettings } from "./stores/settings";
import { useAuth } from "./stores/auth";
import { useProgress } from "./features/progress/store";
import { HomePage } from "./pages/HomePage";
import { PathPage } from "./pages/PathPage";
import { StagePage } from "./pages/StagePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Seiten mit großen Bibliotheken (Blockly, CodeMirror, Pyodide) werden erst bei Bedarf geladen.
const ChapterPage = lazy(() => import("./pages/ChapterPage"));
const FinalTestPage = lazy(() => import("./pages/FinalTestPage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));

export function App() {
  const settings = useSettings();

  useEffect(() => {
    applySettings(settings);
    if (settings.theme !== "system") return;
    // Dem System folgen, wenn sich der Hell/Dunkel-Modus des Geräts ändert
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(useSettings.getState());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  useEffect(() => {
    void useAuth.getState().init().then(() => useProgress.getState().pullFromServer().catch(() => undefined));
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="lernpfad" element={<PathPage />} />
            <Route path="lernpfad/:stageId" element={<StagePage />} />
            <Route path="lernpfad/:stageId/abschlusstest" element={<FinalTestPage />} />
            <Route path="lernpfad/:stageId/:chapterId/:step?" element={<ChapterPage />} />
            <Route path="editor/:lang?" element={<EditorPage />} />
            <Route path="projekte" element={<ProjectsPage />} />
            <Route path="projekte/:projectId" element={<ProjectDetailPage />} />
            <Route path="profil" element={<ProfilePage />} />
            <Route path="anmelden" element={<AuthPage mode="login" />} />
            <Route path="registrieren" element={<AuthPage mode="register" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export function PageLoading({ text = "Funki lädt …" }: { text?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <Funki mood="think" size={110} float />
        <p className="font-display text-lg font-semibold">{text}</p>
      </div>
    </div>
  );
}
