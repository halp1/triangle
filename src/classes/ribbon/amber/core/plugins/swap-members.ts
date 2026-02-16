import { parse } from "@typescript-eslint/parser";
import type {
  MemberExpression,
  VariableDeclarator,
  CallExpression,
  ReturnStatement,
  Identifier,
} from "acorn";
import * as walk from "acorn-walk";
import { generate } from "astring";
import { findVariable } from "eslint-utils";
import vm from "node:vm";
import type { Plugin } from "..";

export const swapMembers = (): Plugin => ({
  name: "Swap Member Expressions",
  apply({ context, ast, ancestryMap, getScope, refresh }) {
    let changed = false;
    const handleMemberExpression = (node: MemberExpression) => {
      if (node.property.type === "Literal" && typeof node.property.value !== "string")
        return;
      if (node.object.type !== "Identifier") return;

      const scope = getScope(node.object);
      let def: ReturnType<typeof findVariable>;
      try {
        def = findVariable((scope as any)!, node.object);
      } catch {
        return;
      }
      const defNode = def?.defs?.[0]?.node as VariableDeclarator;
      if (!defNode) return;
      if (defNode.init?.type === "Identifier") {
        // sometimes, we get n = {}, x = n, x['prop']. Handle this case
        const scope2 = getScope(defNode.init);
        let def2: ReturnType<typeof findVariable>;
        try {
          def2 = findVariable((scope2 as any)!, defNode.init);
        } catch {
          return;
        }
        const defNode2 = def2?.defs?.[0]?.node as VariableDeclarator;
        if (defNode2 && defNode2.init?.type === "ObjectExpression") {
          changed = true;
          Object.assign(defNode.init, defNode2.init);
        }
      }

      if (defNode.init?.type !== "ObjectExpression") return;

      if (node.property.type === "SequenceExpression") {
        // replace with just the last expression
        changed = true;
        Object.assign(node, {
          ...node,
          property: node.property.expressions.at(-1)!,
        });
      }

      const propName = (node.property as any).value as string;

      // constant/identifier member values
      const prop = defNode.init.properties.find((p) => {
        if (p.type !== "Property") return false;
        if (p.key.type === "Literal") {
          return p.key.value === propName;
        } else if (p.key.type === "Identifier") {
          return p.key.name === propName;
        }
        return false;
      });

      if (prop && prop.type === "Property") {
        if (prop.value.type === "Literal") {
          changed = true;
          Object.assign(node, {
            type: "Literal",
            value: prop.value.value,
            raw: JSON.stringify(prop.value.value),
          });
          return;
        } else if (prop && prop.value.type === "FunctionExpression") {
          // get arguments of the call
          const ancestry = ancestryMap.get((node as any)._id)!;
          const parent = ancestry.at(-2)!;
          if (parent.type !== "CallExpression") return;
          if ((parent as CallExpression).callee !== node) return;

          const args = (parent as CallExpression).arguments;
          if (!args.every((a) => a.type === "Literal" || a.type === "MemberExpression")) {
            const func = prop.value;

            if (
              func.body.body.length !== 1 &&
              func.body.body[0].type !== "ReturnStatement"
            )
              return;
            const ret = func.body.body[0] as ReturnStatement;
            const paramNames = func.params.map((p) => (p as Identifier).name);

            const arg = JSON.parse(JSON.stringify(ret.argument));

            if (arg)
              walk.simple(arg, {
                Identifier(idNode) {
                  if (!paramNames.includes(idNode.name)) return;
                  const index = paramNames.indexOf(idNode.name);
                  changed = true;
                  Object.assign(idNode, args[index]);
                },
              });
            else return;

            changed = true;
            Object.assign(parent, arg);
            // for some reason this fucks this up real bad so we have to rebuild ancestry
            refresh();

            return;
          }

          for (const arg of args) {
            if (arg.type === "MemberExpression") {
              if (arg.object.type === "MemberExpression") {
                // swap the call for the body, with args matched and replaced
                const func = prop.value;
                if (
                  func.body.body.length !== 1 &&
                  func.body.body[0].type !== "ReturnStatement"
                )
                  return;
                const ret = func.body.body[0] as ReturnStatement;
                const paramNames = func.params.map((p) => (p as Identifier).name);

                if (ret.argument)
                  walk.simple(ret.argument as any, {
                    Identifier(idNode) {
                      if (!paramNames.includes(idNode.name)) return;
                      const index = paramNames.indexOf(idNode.name);
                      changed = true;
                      Object.assign(idNode, args[index]);
                    },
                  });
                else return;

                changed = true;
                Object.assign(parent, ret.argument);
                return;
              }
              if (arg.object.type === "ThisExpression" || arg.object.type === "Super")
                continue;

              handleMemberExpression(arg);
            }
          }
          const call: CallExpression = {
            type: "CallExpression",
            callee: prop.value,
            arguments: args,
          } as any;

          const customContext = vm.createContext(Object.assign({}, context));
          try {
            const val = vm.runInContext(`(${generate(call)})`, customContext);

            if (typeof val === "function") {
              const src = val.toString();
              const ast = parse(src, { ecmaVersion: 2022, sourceType: "module" });
              const node = ast.body[0];
              changed = true;
              Object.assign(parent, node);
            } else {
              changed = true;
              Object.assign(parent, {
                type: "Literal",
                value: val,
                raw: JSON.stringify(val),
              });
            }
            return;
          } catch (e) {
            if (e instanceof ReferenceError || (e as any).name === "ReferenceError")
              return false;
            throw e;
          }
        }
      }
    };

    walk.simple(ast as any, {
      BlockStatement(node) {
        node.body = node.body.filter((n) => n.type !== "EmptyStatement");
      },
    });

    do {
      changed = false;
      walk.simple(ast as any, {
        MemberExpression(node) {
          handleMemberExpression(node);
        },
      });
    } while (changed);

    return ast;
  },
});
