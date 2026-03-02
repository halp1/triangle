import type { Plugin } from "..";

import * as walk from "acorn-walk";

export const unwrapBlockStatements = (): Plugin => ({
  name: "Unwrap Nested Block Statements",
  apply({ ast }) {
    walk.simple(ast as any, {
      BlockStatement(node) {
        if (node.body.length === 1 && node.body[0].type === "BlockStatement") {
          // should be self explanatory
          Object.assign(node, node.body[0]);
        }
      }
    });
  }
});
