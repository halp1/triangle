import type { Plugin } from "..";

import * as walk from "acorn-walk";

export const simplifySequences = (): Plugin => ({
  name: "Simplify Sequences",
  apply({ ast }) {
    walk.simple(ast as any, {
      SequenceExpression(node) {
        if (
          (node.expressions
            .slice(0, node.expressions.length - 1)
            .every((expr) => expr.type === "AssignmentExpression") &&
            node.expressions.at(-1)?.type === "Literal") ||
          (node.expressions.at(-1)?.type === "BinaryExpression" &&
            !(() => {
              try {
                walk.full(node, (node) => {
                  if (node.type === "CallExpression") {
                    throw new Error("Invalid node type");
                  }
                });
              } catch {
                return true;
              }
              return false;
            })())
        ) {
          Object.assign(node, node.expressions.at(-1));
        }
      }
    });
  }
});
