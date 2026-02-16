import type { BlockStatement, Expression } from "acorn";
import * as walk from "acorn-walk";
import type { Plugin } from "..";
import { generate } from "astring";
import vm from "node:vm";

export const evaluateIfStatements = (): Plugin => ({
  name: "Evaluate If Statements",
  apply({ context, ast }) {
    walk.simple(ast as any, {
      IfStatement(node) {
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
        ];

        let valid = true;
        walk.full(node.test, (node) => {
          if (!validTypes.includes(node.type as any)) {
            valid = false;
          }
        });

        if (!valid) return;

        // evaluate!
        const result: boolean = vm.runInContext(generate(node.test), context);

        if (result) {
          // keep in scope with a block statement, drop everything else
          Object.assign(node, {
            type: "BlockStatement",
            body: [node.consequent],
            start: 0,
            end: 0,
          } satisfies BlockStatement);
        } else {
          // check for an else/else if
          if (node.alternate) {
            Object.assign(node, node.alternate);
          } else {
            Object.assign(node, {
              type: "EmptyStatement",
              start: 0,
              end: 0,
            });
          }
        }
      },
      ConditionalExpression(node) {
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
        ];

        let valid = true;
        walk.full(node.test, (node) => {
          if (!validTypes.includes(node.type as any)) {
            valid = false;
          }
        });

        if (!valid) return;

        // evaluate!
        const result: boolean = vm.runInContext(generate(node.test), context);

        if (result) {
          // switcheroo
          Object.assign(node, node.consequent);
        } else {
          // check for an else/else if
          Object.assign(node, node.alternate);
        }
      },
    });
  },
});
