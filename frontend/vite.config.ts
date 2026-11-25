import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/** Share-preview tags that need the site's absolute address. Only the public build
 * sets VITE_SITE_URL (.env.static); a local or forked build without it gets none. */
function absoluteUrlTags(siteUrl: string | undefined): Plugin {
  return {
    name: "absolute-url-tags",
    transformIndexHtml() {
      if (!siteUrl) return [];
      const base = siteUrl.replace(/\/$/, "");
      const image = `${base}/og-image.png`;
      return [
        { tag: "link", attrs: { rel: "canonical", href: `${base}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:url", content: `${base}/` }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:image", content: image }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" }, injectTo: "head" },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" }, injectTo: "head" },
        {
          tag: "meta",
          attrs: { property: "og:image:alt", content: "AI Governance Radar: AI laws and standards, and the dates that matter" },
          injectTo: "head",
        },
        { tag: "meta", attrs: { name: "twitter:image", content: image }, injectTo: "head" },
        {
          tag: "link",
          attrs: { rel: "alternate", type: "application/atom+xml", title: "Record changes", href: `${base}/data/changes.xml` },
          injectTo: "head",
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), absoluteUrlTags(loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL)],
  // The static public build (DEC-029) goes to its own folder so it never replaces
  // the local build the backend serves from dist/.
  build: { outDir: mode === "static" ? "dist-static" : "dist" },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
}) as import("vite").UserConfig & { test: unknown });
