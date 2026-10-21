import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ADR-0021: aturan aksesibilitas JSX versi strict. Plugin jsx-a11y sudah didaftarkan oleh
  // eslint-config-next, jadi di sini hanya aturannya.
  {
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.strict.rules,
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Laporan Playwright.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
