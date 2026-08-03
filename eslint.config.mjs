import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The default is root-relative, so it misses build output nested inside
    // agent worktrees — which is thousands of generated files, none of it ours.
    "**/.next/**",
    ".claude/**",
    ".agents/**",
  ]),
]);

export default eslintConfig;
