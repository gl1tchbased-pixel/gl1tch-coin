import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Same file set eslint-config-next registers the react-hooks plugin for; without it the
    // override also hits other files (e.g. .cjs) where the plugin isn't defined and lint aborts.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // Driving state from effects (data fetch, IntersectionObserver, reduced-motion
      // sync) is the correct pattern in these components; this preview rule over-reports.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not part of the site: frame-driven Remotion video compositions and CommonJS automation
    // scripts follow their own conventions (inline components per frame, require()).
    "remotion/**",
    "e2e/**",
  ]),
]);

export default eslintConfig;
