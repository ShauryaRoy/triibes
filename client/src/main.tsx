import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(<App />);
// Reveal after mount to avoid FOUC/old UI flash
requestAnimationFrame(() => { rootEl.style.opacity = "1"; });
