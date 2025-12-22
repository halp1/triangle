import js from "@eslint/js";
import n from "eslint-plugin-n";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  n.configs["flat/recommended-module"],
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    settings: {
      n: {
        tryExtensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".node"],
        resolvePaths: ["./src"]
      }
    },
    rules: {
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": [
        "error",
        {
          version: ">=22.0.0",
          ignores: ["modules", "dynamicImport"]
        }
      ],
      "n/no-unsupported-features/es-builtins": [
        "error",
        {
          version: ">=22.0.0"
        }
      ],
      "n/no-unsupported-features/node-builtins": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": false
        }
      ]
    }
  },
  {
    ignores: ["dist/**", "node_modules/**", "docs/**", "test/data/**"]
  }
);
