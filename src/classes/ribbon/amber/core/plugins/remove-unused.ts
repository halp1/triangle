import type { Plugin } from "..";

import type { Identifier, VariableDeclaration } from "acorn";
import * as walk from "acorn-walk";
import { findVariable } from "eslint-utils";

export const removeUnusedDeclarations = (): Plugin => ({
  name: "Remove Unused Declarations",
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
          if (def?.references?.every((r) => !r.isRead())) {
            // yes, we can remove it
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
            changed = true;
          }
        },
        FunctionDeclaration(node) {
          const scope = getScope(node.id!);
          const def = findVariable((scope as any)!, node.id as Identifier);
          if (
            def?.references?.every(
              (r) =>
                !r.isRead() ||
                ancestryMap
                  .get((r.identifier as Identifier)._id!)
                  ?.slice(0, -1)
                  .includes(node)
            )
          ) {
            // get rid of the function
            Object.assign(node, {
              type: "EmptyStatement",
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
