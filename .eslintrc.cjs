/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  root: true,
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { fixStyle: "separate-type-imports" },
    ],
    "@typescript-eslint/array-type": ["error", { default: "generic" }],
  },
  overrides: [
    {
      files: ["**/*.test.ts"],
      plugins: ["vitest"],
      extends: ["plugin:vitest/recommended"],
    },
  ],
};
