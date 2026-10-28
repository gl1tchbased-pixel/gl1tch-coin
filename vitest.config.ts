import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // @x402/next imports "next/server" without an extension; Node's own ESM loader can't resolve
    // that (next has no exports map), so let Vite transform it like app code.
    server: { deps: { inline: [/@x402\/next/] } },
  },
});
