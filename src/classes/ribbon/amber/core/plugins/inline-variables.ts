import type { Plugin } from "..";

import type {
  Identifier,
  VariableDeclaration,
  VariableDeclarator
} from "acorn";
import * as walk from "acorn-walk";
import { findVariable } from "eslint-utils";

export const inlineVariables = (): Plugin => ({
  name: "Inline Single-Use Variables",
  apply({ ast, ancestryMap, getScope, refresh }) {
    let changed = false;
    do {
      changed = false;
      refresh();
      walk.simple(ast as any, {
        VariableDeclarator(node) {
          const scope = getScope(node.id);

          let def: ReturnType<typeof findVariable>;
          try {
            def = findVariable((scope as any)!, node.id as Identifier);
          } catch {
            return;
          }

          if (
            node.init &&
            (
              [
                "Literal",
                "ObjectExpression",
                "ArrayExpression",
                "FunctionExpression",
                "ArrowFunctionExpression",
                "NewExpression",
                "Identifier",
                "NewExpression"
              ] satisfies NonNullable<
                VariableDeclarator["init"]
              >["type"][] as NonNullable<VariableDeclarator["init"]>["type"][]
            ).includes(node.init.type) && // only inline simple things
            def?.references?.filter((r) => r.isRead()).length === 1 &&
            def?.references?.filter((r) => r.isWrite()).length === 1
          ) {
            // yes, we can swap
            const value = JSON.parse(JSON.stringify(node.init));
            const parent = ancestryMap.get((node as any)._id)!.at(-2)!;
            if (parent.type === "VariableDeclaration") {
              // parent is the declaration, we need to remove this from the declarations list
              (parent as VariableDeclaration).declarations = (
                parent as VariableDeclaration
              ).declarations.filter((d) => d !== node);
              // remove empty declarations
              if ((parent as VariableDeclaration).declarations.length === 0) {
                Object.assign(parent, {
                  type: "EmptyStatement",
                  start: 0,
                  end: 0
                });
              }
            } else {
              // byebye!
              Object.assign(node, {
                type: "EmptyStatement",
                start: 0,
                end: 0
              });
            }

            const ref = def.references.find((r) => r.isRead())!;
            Object.assign(ref.identifier, value);
            changed = true;
          }
        }
      });
    } while (changed);
  }
});
