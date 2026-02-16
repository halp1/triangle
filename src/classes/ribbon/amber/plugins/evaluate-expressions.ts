import type { Expression } from "acorn";
import * as walk from "acorn-walk";
import { generate } from "astring";
import vm from "node:vm";
import type { Plugin } from "..";

export const evaluateExpressions = (): Plugin => ({
  name: "Evaluate Expressions",
  apply({ ast, context }) {
    walk.full(ast as any, (node) => {
      // check to see if we can evaluate
      let validTypes: Expression["type"][] = [
        "BinaryExpression",
        "ChainExpression",
        "ConditionalExpression",
        "Literal",
        "TemplateLiteral",
        "LogicalExpression",
        "ParenthesizedExpression",
        "SequenceExpression",
        "UnaryExpression",
        "ArrayExpression",
        // "ObjectExpression",
      ];

      let valid = true;
      try {
        walk.full(node, (node) => {
          if (!validTypes.includes(node.type as any)) {
            throw new Error("Invalid node type");
          }
        });
      } catch {
        valid = false;
      }

      if (!valid) return;

      // evaluate!
      try {
				let str = generate(node);
				if (node.type === 'ObjectExpression') {
					str = `(${str})`;
				}
        const result: boolean = vm.runInContext(str, context);

        Object.assign(node, {
          type: "Literal",
          value: result,
          raw: JSON.stringify(result, ( _, value) =>
            typeof value === "bigint" ? value.toString() + "n" : value
          ),
        } as Expression);
      } catch {}
    });
  },
});
