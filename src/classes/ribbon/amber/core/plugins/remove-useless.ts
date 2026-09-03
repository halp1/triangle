import type { Plugin } from "..";

import * as walk from "acorn-walk";

export const removeUselessStatements = (): Plugin => ({
  name: "Remove Useless Statements",
  apply({ ast }) {
    walk.simple(ast as any, {
      ExpressionStatement(node) {
        if (
          (node.expression.type === "UnaryExpression" &&
            node.expression.operator === "void") ||
          node.expression.type === "Literal"
        ) {
          Object.assign(node, {
            type: "EmptyStatement",
            start: 0,
            end: 0
          });
        }
      }
    });
  }
});
