import type { ViteUserConfig } from "vite-plus";
import { defineConfig } from "vite-plus";

const config: ViteUserConfig = defineConfig({
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "import"],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    env: {
      browser: true,
      builtin: true,
      es2026: true,
      node: true,
    },
    ignorePatterns: ["dist", "website/build", "website/.docusaurus"],
    rules: {
      "typescript/array-type": ["error", { default: "generic" }],
      "typescript/no-empty-object-type": "off",
      "typescript/no-explicit-any": "warn",
      "typescript/only-throw-error": "off",
      "typescript/restrict-template-expressions": ["error", { allowNumber: true }],
      "typescript/consistent-type-imports": ["error", { fixStyle: "separate-type-imports" }],
    },
    overrides: [
      {
        files: ["**/*.test.{js,mjs,cjs,ts,jsx,tsx}"],
        rules: {
          "vitest/valid-title": ["error", { allowArguments: true }],
        },
        plugins: ["vitest"],
      },
    ],
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  pack: {
    entry: ["src/index.ts", "src/redux.ts"],
    sourcemap: true,
    format: ["esm", "cjs"],
    dts: true,
    fixedExtension: false,
  },
  test: {
    setupFiles: ["./test-setup"],
  },
  fmt: {
    sortImports: true,
  },
  staged: {
    "*.{ts,md}": "vp fmt",
  },
});

export default config;
