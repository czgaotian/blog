import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()];

  if (mode !== "test") {
    plugins.push(
      cloudflare({
        configPath: "../server/wrangler.toml",
        persistState: { path: "../server/.wrangler/state" },
      }),
    );
  }

  return {
    base: "/",
    plugins,
    build: {
      manifest: true,
      outDir: "dist",
      emptyOutDir: true,
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
  };
});
