import * as walk from "acorn-walk";
import type { Plugin } from "..";

export const mergeStrings = (): Plugin => ({
  name: "Merge Strings",
  apply({ ast }) {
    walk.simple(ast as any, {
      BinaryExpression(node) {
        if (node.operator === "+") {
          const left =
            node.left.type === "Literal" && typeof node.left.value === "string"
              ? node.left
              : null;
          const right =
            node.right.type === "Literal" && typeof node.right.value === "string"
              ? node.right
              : null;
          if (left && right) {
            Object.assign(node, {
              type: "Literal",
              value: ((left.value as string) + right.value) as string,
              raw: JSON.stringify(((left.value as string) + right.value) as string),
            });
          }
        }
      },
    });
  },
});
