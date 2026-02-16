import type {
  BlockStatement,
  Program,
} from "acorn";
import type { Plugin } from "..";
import * as walk from "acorn-walk";

export const unwrapIfStatements = (): Plugin => ({
  name: "Unwrap If Statements",
  apply({ ast, ancestryMap }) {
    // take if statements with a sequence as the conditional and unwrap them
    walk.simple(ast as any, {
      IfStatement(node) {
        if (node.test.type !== "SequenceExpression") return;

        const seq = node.test;
        if (seq.expressions.length <= 1) return;

        const parent = ancestryMap.get((node as any)._id)!.at(-2)!;
        if (!parent || (parent.type !== "BlockStatement" && parent.type !== "Program"))
          return;

        const body =
          parent.type === "Program"
            ? (parent as Program).body
            : (parent as BlockStatement).body;
        const index = body.indexOf(node);
        if (index === -1) return;

        const statements = seq.expressions.slice(0, -1).map((expr) => ({
          type: "ExpressionStatement" as const,
          expression: expr,
          start: node.start,
          end: node.end,
        }));
        body.splice(index, 0, ...statements);

        // replace the if test with the last expression
        node.test = seq.expressions[seq.expressions.length - 1];
      },
    });
  },
});
