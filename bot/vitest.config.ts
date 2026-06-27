import { defineConfig, type Plugin } from "vitest/config";

// Source uses NodeNext ".js" specifiers that point at ".ts" files; map them for Vite.
function jsToTs(): Plugin {
  return {
    name: "js-to-ts-resolver",
    enforce: "pre",
    async resolveId(source, importer) {
      if (importer && /^\.{1,2}\//.test(source) && source.endsWith(".js")) {
        const resolved = await this.resolve(source.slice(0, -3) + ".ts", importer, {
          skipSelf: true,
        });
        if (resolved) return resolved;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [jsToTs()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
