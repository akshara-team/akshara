import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Node globals without pulling in @types/node for one variable.
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // CSS is skipped in tests by default; the contrast test reads theme.css as raw text.
    css: { include: [/theme\.css/] },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Akshara — reading practice",
        short_name: "Akshara",
        description: "Reading practice for early-grade children in Kannada, Tamil and Hindi.",
        theme_color: "#FDE047",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        // Relative, so the installed app opens under whatever base it was built for.
        start_url: ".",
        scope: ".",
        // TODO: add 192/512 PNG icons before deploy; svg is enough to install while building.
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  server: {
    // The phone pass (D4) opens this dev server through an HTTPS tunnel, whose hostname Vite
    // cannot know in advance. A leading dot allows the provider's subdomains.
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io", ".loca.lt"],
    proxy: {
      // Dev: avoid CORS by proxying the API. No backend change needed.
      // AKSHARA_API points the proxy elsewhere when port 8000 is taken.
      "/v1": { target: process.env.AKSHARA_API ?? "http://localhost:8000", changeOrigin: true },
    },
  },
});
