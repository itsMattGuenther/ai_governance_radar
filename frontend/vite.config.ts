import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
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
