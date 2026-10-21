import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
        start_url: "/",
        // TODO: add 192/512 PNG icons before deploy; svg is enough to install while building.
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  server: {
    proxy: {
      // Dev: avoid CORS by proxying the API. No backend change needed.
      "/v1": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
