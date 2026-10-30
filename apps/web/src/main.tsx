import { createRoot } from "react-dom/client";

// Placeholder boot — the app shell, router, and i18n land in Phase 1 Task 5.
const el = document.getElementById("root");
if (!el) throw new Error("missing #root element");

createRoot(el).render(<main style={{ fontFamily: "system-ui", padding: "2rem" }}>Reph</main>);
