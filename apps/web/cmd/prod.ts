import { serve, file } from "bun";
import { resolve, join } from "path";

const PORT = Number(process.env.WEB_PORT || 3000);
const DIST_DIR = resolve(import.meta.dir, "../dist");

console.log(`📁 Serving static files from: ${DIST_DIR}`);

const server = serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    console.log(`[web] ${req.method} ${pathname}`);

    // Normalize to a relative path so join(DIST_DIR, ...) does not treat
    // the pathname as an absolute path (leading slash would discard DIST_DIR).
    const rel = pathname.replace(/^\/+/, "");

    // Candidate files to try (ordered)
    const candidates = [rel, rel && rel + ".html", "index.html"].filter(
      Boolean
    );

    for (const p of candidates) {
      const pth = join(DIST_DIR, p);
      const f = file(pth);
      if (await f.exists()) {
        return new Response(f);
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`🚀 Web server running at http://0.0.0.0:${PORT}`);
