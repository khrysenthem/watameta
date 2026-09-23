import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 10_000,
    hookTimeout: 60_000,
    server: {
      deps: {
        inline: [/next-auth/, /@auth\/core/, /next\//],
      },
    },
  },
});
