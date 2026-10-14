import type { Plugin } from "..";

import { parse, type Options as ParserOptions } from "acorn";
import { generate } from "astring";

export const rebuild = (options?: ParserOptions): Plugin => ({
  name: "Rebuild AST",
  apply({ ast, refresh }) {
    ast = parse(
      generate(ast),
      options ?? {
        sourceType: "module",
        ecmaVersion: 2022,
        ranges: true
      }
    );

    refresh(ast);
  }
});
