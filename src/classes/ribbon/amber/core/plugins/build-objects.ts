import type { Plugin } from "..";

import type {
  AssignmentExpression,
  Expression,
  Identifier,
  Node,
  ObjectExpression,
  SequenceExpression,
  VariableDeclarator
} from "acorn";
import * as walk from "acorn-walk";
import { findVariable } from "eslint-utils";

export const buildObjects = (): Plugin => ({
  name: "Build Objects",
  apply({ ast, getScope, ancestryMap }) {
    walk.simple(ast as any, {
      MemberExpression(node) {
        if (
          node.property.type === "Literal" &&
          typeof node.property.value !== "string"
          // || !node.computed
        )
          return;

        const ancestors = ancestryMap.get((node as any)._id)!;
        const parent = ancestors.at(-2)!;
        const container = ancestors.at(-3)!;

        if (parent.type !== "AssignmentExpression") return;
        if ((parent as AssignmentExpression).left !== node) return;
        // functions must be executed in the correct order
        if ((parent as AssignmentExpression).right.type === "CallExpression")
          return;

        if (node.property.type === "SequenceExpression") {
          // replace with just the last expression
          Object.assign(node, {
            ...node,
            property: node.property.expressions.at(-1)!
          });
        }

        const scope = getScope(parent);

        let def: ReturnType<typeof findVariable>;
        try {
          def = findVariable((scope as any)!, node.object as Identifier);
        } catch {
          return;
        }
        const defNode = def?.defs?.[0]?.node as VariableDeclarator;
        if (!defNode) return;

        if (defNode.init?.type !== "ObjectExpression") {
          return;
        }

        if (getScope(defNode) !== scope) return;

        // ensure that the assignment value is not dependent on the object itself or other variables defined later

        try {
          if (
            (parent as AssignmentExpression).right.type !==
              "FunctionExpression" &&
            (parent as AssignmentExpression).right.type !==
              "ArrowFunctionExpression"
          ) {
            walk.full((parent as AssignmentExpression).right as any, (n) => {
              if (n.type === "Identifier") {
                const scope = getScope(n);
                const variable = findVariable((scope as any)!, n as Identifier);
                const source = variable?.defs?.[0]?.node as VariableDeclarator;
                if (!source) return;

                // case 1 - self reference
                if (source === defNode) {
                  throw new Error("Self reference");
                }

                // case 2: defined later
                if (getScope(source) === scope) {
                  walk.full(scope?.block as any, (sn) => {
                    if (sn === source) {
                      throw new Error("Defined later");
                    }
                  });
                }
              }
            });
          }
        } catch {
          return;
        }

        const props = (defNode.init as ObjectExpression).properties;

        const propName = (node.property as any).value as string;

        let prop = props.find((p) => {
          if (p.type !== "Property") return false;
          if (p.key.type === "Literal") {
            return p.key.value === propName;
          } else if (p.key.type === "Identifier") {
            return p.key.name === propName;
          }
          return false;
        });

        if (!prop) {
          props.push({
            type: "Property",
            key: node.property as Expression,
            value: (parent as AssignmentExpression).right,
            kind: "init",
            method: false,
            shorthand: false,
            computed: false,
            start: 0,
            end: 0
          });

          // fully remove parent from the tree
          if (container.type === "SequenceExpression") {
            // if its in a sequence expression, remove it from the expressions list
            const seq = container as SequenceExpression;
            seq.expressions = seq.expressions.filter((e: Node) => e !== parent);
            if (seq.expressions.length === 0) {
              Object.assign(seq, {
                type: "UnaryExpression",
                operator: "void",
                prefix: true,
                argument: {
                  type: "Literal",
                  value: 0,
                  raw: "0"
                }
              });
            }
          } else {
            Object.assign(parent, {
              type: "EmptyStatement",
              start: 0,
              end: 0
            });
            return;
          }
        }
      }
    });
  }
});
