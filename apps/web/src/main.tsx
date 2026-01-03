import { createRoot } from "react-dom/client";
import "./index.css";

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<div className="text-2xl">Hello, Spenicl2e!</div>);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
