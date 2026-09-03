import type { Plugin } from "..";

import * as walk from "acorn-walk";

export const simplifyIfStatements = (): Plugin => ({
  name: "Simplify If Statements",
  apply({ ast }) {
    // safety measure: wrap if statements in blocks so we can safely modify them without worrying about scope issues
    walk.simple(ast as any, {
      IfStatement(node) {
        if (node.consequent.type !== "BlockStatement") {
          Object.assign(node, {
            type: "IfStatement",
            test: node.test,
            consequent: {
              type: "BlockStatement",
              body: [node.consequent],
              start: 0,
              end: 0
            },
            alternate:
              node.alternate && node.alternate.type === "BlockStatement"
                ? node.alternate
                : node.alternate
                  ? {
                      type: "BlockStatement",
                      body: [node.alternate],
                      start: 0,
                      end: 0
                    }
                  : null,
            start: 0,
            end: 0
          });
        }
      }
    });

    // match expressions that are x && something and replace it with an if
    let changed = false;
    do {
      changed = false;
      walk.simple(ast as any, {
        ExpressionStatement(node) {
          if (
            node.expression.type === "LogicalExpression" &&
            (node.expression.operator === "&&" ||
              node.expression.operator === "||")
          ) {
            const logExp = node.expression;
            Object.assign(node, {
              type: "IfStatement",
              test:
                node.expression.operator === "&&"
                  ? logExp.left
                  : {
                      type: "UnaryExpression",
                      operator: "!",
                      argument: logExp.left,
                      prefix: true,
                      start: 0,
                      end: 0
                    },
              consequent: {
                type: "BlockStatement",
                body: [
                  {
                    type: "ExpressionStatement",
                    expression: logExp.right,
                    start: 0,
                    end: 0
                  }
                ],
                start: 0,
                end: 0
              },
              alternate: null,
              start: 0,
              end: 0
            });
            changed = true;
          }
        }
      });
    } while (changed);

    // look for if statements with single if statements inside and merge them
    do {
      changed = false;
      walk.simple(ast as any, {
        IfStatement(node) {
          if (
            node.consequent.type === "BlockStatement" &&
            node.consequent.body.length === 1 &&
            node.consequent.body[0].type === "IfStatement" &&
            !node.alternate &&
            !node.consequent.body?.[0]?.alternate
          ) {
            const innerIf = node.consequent.body[0];
            Object.assign(node, {
              type: "IfStatement",
              test: {
                type: "LogicalExpression",
                operator: "&&",
                left: node.test,
                right: innerIf.test,
                start: 0,
                end: 0
              },
              consequent: innerIf.consequent,
              alternate: innerIf.alternate,
              start: 0,
              end: 0
            });
            changed = true;
          }
        }
      });
    } while (changed);
  }
});
