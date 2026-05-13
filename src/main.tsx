import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { AdminPanel } from "./components/AdminPanel";

function Router() {
  const [path, setPath] = useState(window.location.hash || "#/");

  useEffect(() => {
    const handler = () => setPath(window.location.hash || "#/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Admin panel route: visit yourwebsite.com/#/admin
  if (path.startsWith("#/admin")) {
    return <AdminPanel />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>
);
