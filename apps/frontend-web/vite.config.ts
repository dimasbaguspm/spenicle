import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

console.log("Web App Version:", process.env.VITE_WEB_APP_VERSION);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    VITE_WEB_APP_VERSION: JSON.stringify(
      process.env.VITE_WEB_APP_VERSION || "dev",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
