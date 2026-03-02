import type { Plugin } from "..";

import * as walk from "acorn-walk";

export const swapComputedKeys = (): Plugin => ({
  name: "Swap Computed Keys",
  apply({ ast }) {
    walk.simple(ast as any, {
      PropertyDefinition(node) {
        if (
          node.computed &&
          node.key.type === "Literal" &&
          typeof node.key.value === "string"
        ) {
          const name = node.key.value;
          // some sort of chatgpt generated regex that works
          if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name)) {
            node.key = { type: "Identifier", name, start: 0, end: 0 };
            node.computed = false;
          }
        }
      },
      MethodDefinition(node) {
        if (
          node.computed &&
          node.key.type === "Literal" &&
          typeof node.key.value === "string"
        ) {
          const name = node.key.value;
          // some sort of chatgpt generated regex that works
          if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name)) {
            node.key = { type: "Identifier", name, start: 0, end: 0 };
            node.computed = false;
          }
        }
      },
      MemberExpression(node) {
        if (
          node.computed &&
          node.property.type === "Literal" &&
          typeof node.property.value === "string"
        ) {
          const name = node.property.value;
          // some sort of chatgpt generated regex that works
          if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name)) {
            node.property = { type: "Identifier", name, start: 0, end: 0 };
            node.computed = false;
          }
        }
      }
    });
  }
});
