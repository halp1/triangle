import { defineConfig } from "oxfmt";

export default defineConfig({
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  useTabs: false,
  trailingComma: "none",
  bracketSpacing: true,
  arrowParens: "always",
  endOfLine: "lf",
  sortPackageJson: true,
  printWidth: 80,
  sortImports: {
    newlinesBetween: true,
    groups: [
      "value-internal",
      "value-parent",
      ["value-index", "value-sibling"],
      "type-parent",
      ["type-index", "type-sibling"],
      "value-builtin",
      "type-builtin",
      "value-external",
      "type-external",
      "unknown"
    ]
  },
  ignorePatterns: ["dist", "docs", "test/data", "bun.lock"]
});
