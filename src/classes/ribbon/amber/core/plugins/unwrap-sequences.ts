import type { BlockStatement, ExpressionStatement, Program, ReturnStatement, SwitchCase, ThrowStatement } from "acorn";
import type { Plugin } from "..";
import * as walk from "acorn-walk";

export const unwrapSequences = (): Plugin => ({
  name: "Unwrap Sequences",
  apply({ ast, ancestryMap }) {
    // case 1: most basic version, sequences just sitting there as a full expression
    walk.simple(ast as any, {
      ExpressionStatement(node) {
        if (node.expression.type !== "SequenceExpression") return;

        const seq = node.expression;
        if (seq.expressions.length <= 1) return;

        const ancestors = ancestryMap.get((node as any)._id)!;
        const parent = ancestors.at(-2)!;

        let body: any[] | null = null;

        if (parent.type === "Program") {
          body = (parent as Program).body;
        } else if (parent.type === "BlockStatement" || parent.type === "SwitchCase") {
          body = (parent as Program).body ?? (parent as SwitchCase).consequent;
        } else {
          return;
        }

        const index = body.indexOf(node);
        if (index === -1) return;

        const statements = seq.expressions.map((expr) => ({
          type: "ExpressionStatement",
          expression: expr,
          start: node.start,
          end: node.end,
        }));

        // 🔥 splice instead of wrap
        body.splice(index, 1, ...statements);
      },
    });

    // case 2: sequences in a return
    walk.simple(ast as any, {
      ReturnStatement(node) {
        if (node.argument?.type === "SequenceExpression") {
          const seq = node.argument;
          if (seq.expressions.length > 1) {
            // turn into multiple expression statements, with the last one being the return value
            const statements: (ExpressionStatement | ReturnStatement)[] = seq.expressions
              .slice(0, -1)
              .map((expr) => ({
                type: "ExpressionStatement" as const,
                expression: expr,
                start: 0,
                end: 0,
              }));
            statements.push({
              type: "ReturnStatement",
              argument: seq.expressions.at(-1)!,
              start: 0,
              end: 0,
            });
            const parent = ancestryMap.get(node._id!)!.at(-2)!;
            if (parent.type !== "BlockStatement") {
              // need to wrap in a block statement
              const block: BlockStatement = {
                type: "BlockStatement",
                body: statements,
                start: 0,
                end: 0,
              };
              Object.assign(node, block);
            } else {
              // can just replace the return statement with multiple statements
              const idx = (parent as BlockStatement).body.indexOf(node);
              (parent as BlockStatement).body.splice(idx, 1, ...statements);
            }
          }
        }
      },
    });

    // case 2.5: sequences in a throw
    walk.simple(ast as any, {
      ThrowStatement(node) {
        if (node.argument?.type === "SequenceExpression") {
          const seq = node.argument;
          if (seq.expressions.length > 1) {
            // turn into multiple expression statements, with the last one being the return value
            const statements: (ExpressionStatement | ThrowStatement)[] = seq.expressions
              .slice(0, -1)
              .map((expr) => ({
                type: "ExpressionStatement" as const,
                expression: expr,
                start: 0,
                end: 0,
              }));
            statements.push({
              type: "ThrowStatement",
              argument: seq.expressions.at(-1)!,
              start: 0,
              end: 0,
            });
            const parent = ancestryMap.get(node._id!)!.at(-2)!;
            if (parent.type !== "BlockStatement") {
              // need to wrap in a block statement
              const block: BlockStatement = {
                type: "BlockStatement",
                body: statements,
                start: 0,
                end: 0,
              };
              Object.assign(node, block);
            } else {
              // can just replace the return statement with multiple statements
              const idx = (parent as BlockStatement).body.indexOf(node);
              (parent as BlockStatement).body.splice(idx, 1, ...statements);
            }
          }
        }
      },
    });

    // case 3: sequences in an if statement.
    // we need to watch out for else ifs here
    walk.simple(ast as any, {
      IfStatement(node) {
        if (node.test.type === "SequenceExpression") {
          const seq = node.test;
          if (seq.expressions.length > 1) {
            // turn into multiple expression statements, with the last one being the test value
            const statements: ExpressionStatement[] = seq.expressions
              .slice(0, -1)
              .map((expr) => ({
                type: "ExpressionStatement" as const,
                expression: expr,
                start: 0,
                end: 0,
              }));
            const newIfTest = seq.expressions.at(-1)!;
            const parent = ancestryMap.get(node._id!)!.at(-2)!;
            if (parent.type !== "BlockStatement") {
              // need to wrap in a block statement
              const block: BlockStatement = {
                type: "BlockStatement",
                body: [
                  ...statements,
                  {
                    ...node,
                    test: newIfTest,
                    start: 0,
                    end: 0,
                  },
                ],
                start: 0,
                end: 0,
              };
              Object.assign(node, block);
            } else {
              // can just replace the if statement with multiple statements
              const idx = (parent as BlockStatement).body.indexOf(node);
              (parent as BlockStatement).body.splice(idx, 1, ...statements, {
                ...node,
                test: newIfTest,
                start: 0,
                end: 0,
              });
            }
          }
        }
      },
    });

    // case 4: sequences in a switch statement
    walk.simple(ast as any, {
      SwitchStatement(node) {
        if (node.discriminant.type === "SequenceExpression") {
          const seq = node.discriminant;
          if (seq.expressions.length > 1) {
            // turn into multiple expression statements, with the last one being the discriminant value
            const statements: ExpressionStatement[] = seq.expressions
              .slice(0, -1)
              .map((expr) => ({
                type: "ExpressionStatement" as const,
                expression: expr,
                start: 0,
                end: 0,
              }));
            const newSwitchDiscriminant = seq.expressions.at(-1)!;
            const parent = ancestryMap.get(node._id!)!.at(-2)!;
            if (parent.type !== "BlockStatement") {
              // need to wrap in a block statement
              const block: BlockStatement = {
                type: "BlockStatement",
                body: [
                  ...statements,
                  {
                    ...node,
                    discriminant: newSwitchDiscriminant,
                    start: 0,
                    end: 0,
                  },
                ],
                start: 0,
                end: 0,
              };
              Object.assign(node, block);
            } else {
              // can just replace the switch statement with multiple statements
              const idx = (parent as BlockStatement).body.indexOf(node);
              (parent as BlockStatement).body.splice(idx, 1, ...statements, {
                ...node,
                discriminant: newSwitchDiscriminant,
                start: 0,
                end: 0,
              });
            }
          }
        }
      },
    });
  },
});
