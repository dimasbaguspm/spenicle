import { createRoot } from "react-dom/client";
import "./index.css";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SnackbarsProvider } from "@dimasbaguspm/versaur";
import { PageRouter } from "./router/page/page-router";

const queryClient = new QueryClient();

const App = () => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SnackbarsProvider>
        <PageRouter />
      </SnackbarsProvider>
    </QueryClientProvider>
  </StrictMode>
);

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
