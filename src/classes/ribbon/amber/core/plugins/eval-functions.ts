import type { Plugin } from "..";

import { randomUUID } from "node:crypto";
import vm from "node:vm";

import type {
  AssignmentExpression,
  CallExpression,
  FunctionDeclaration,
  Identifier,
  Node,
  VariableDeclarator
} from "acorn";
import * as walk from "acorn-walk";
import { generate } from "astring";
import { findVariable } from "eslint-utils";

export const evalFunctions = (): Plugin => ({
  name: "Eval Functions",
  apply({ context, ast, ancestryMap, getScope }) {
    let rejectionKey = randomUUID();

    const bringFunctionInScope = (node: FunctionDeclaration) => {
      const parent = ancestryMap.get(node._id!)?.at(-2);
      if (!parent || parent.type === "Program") return;

      const params = node.params as Identifier[];

      // core idea: create an IIFE that defines all the variables we need in scope and returns the function definition. Do this recursively
      let scopingCode = `${node.id.name} = (() => {\n`;

      walk.simple(node.body, {
        Identifier(idNode) {
          // skip if its a recursive call or a parameter
          if (idNode.name === node.id?.name) return;
          if (
            params.some(
              (a) => a.type === "Identifier" && a.name === idNode.name
            )
          )
            return;
          const scope = getScope(idNode);
          const def = findVariable((scope as any)!, idNode);

          // global scope things are already defined
          const defNode = def?.defs?.[0]?.node as Node;
          if (!defNode) return;
          if (ancestryMap.get((defNode as any)._id)?.length === 2) return;

          if (defNode.type === "FunctionDeclaration") {
            // recursion!
            const code = bringFunctionInScope(defNode as FunctionDeclaration);
            if (code) {
              scopingCode += code + "\n";
            }
          } else {
            scopingCode += generate(defNode) + ";\n";
          }
        }
      });

      scopingCode += "return " + generate(node);
      scopingCode += `\n})();\n`;

      return scopingCode;
    };
    const evalCall = (node: CallExpression) => {
      let abort = false;
      const callee = node.callee as Identifier;

      // custom context for this call, will hold variables and outermost function definition
      const customContext = vm.createContext(Object.assign({}, context));
      if (!callee.name) return undefined;

      let definitions: string[] = [];
      let definedNodes = new Set<number>();

      /** adds a variable to the list of definitions. e.x. If we have s(y, 0, 0, 915) we need `y` */
      const define = (node: Identifier) => {
        const scope = getScope(node);
        const def = findVariable((scope as any)!, node);

        const defNode = def?.defs?.[0]?.node as Node;

        if (!defNode) return;

        if (definedNodes.has(defNode._id!)) return;
        definedNodes.add(defNode._id!);

        // the script sometimes detects deobfuscation functoins being called inside other deobfuscation functions, avoid this
        if (
          defNode?.type === "FunctionDeclaration" ||
          defNode?.type === "FunctionExpression"
        ) {
          abort = true;
          return;
        }
        if (defNode) {
          if (
            defNode.type === "VariableDeclarator" &&
            (defNode as VariableDeclarator).init === null
          ) {
            // if there are variables that aren't defined explicitly, we have to find the original definition, and then make sure to recursively define other variables used in the definition
            const firstWrite = def?.references?.find((r) =>
              r.isWrite()
            )?.writeExpr;
            const target = ancestryMap.get((firstWrite as Node)?._id!)?.at(-2)!;
            const expr = target as AssignmentExpression;
            walk.simple(expr.right, {
              Identifier(node) {
                define(node);
              }
            });
            if (target) {
              definitions.push(generate(target));
            }
            return;
          } else {
            // otherwise its chill we just do it normally
            definitions.push(generate(defNode));
          }
        }
      };

      // make sure we have the vars we need
      node.arguments.forEach((node) => {
        // use a walk in case we encounter a unary expression, etc
        walk.simple(node, {
          Identifier(node) {
            define(node);
          }
        });
      });

      if (abort) return rejectionKey;

      const scope = getScope(node);
      const def = findVariable((scope as any)!, node.callee as Identifier);

      const defNode = def?.defs[0]?.node as FunctionDeclaration;

      let raw = "";

      // start recursively pulling in function definitions
      if (defNode && defNode.type === "FunctionDeclaration") {
        // if (defNode.params.length !== 5) return rejectionKey;
        const scopingCode = bringFunctionInScope(defNode);
        if (scopingCode) raw = scopingCode;
      } else if (!(callee.name in context)) return rejectionKey;

      raw += "\n" + definitions.join(";\n");
      raw += `\n${generate(node)};`;

      try {
        const res = vm.runInContext(raw, customContext);
        // console.log("EVAL", generate(node), "->", res);
        return res;
      } catch (e) {
        // console.error("Code for below error:");
        // console.log(prettierSync.format(raw, { parser: "typescript" }));
        // console.log(raw);
        // console.error(e);
        // console.warn("(this is likely dead code)")
        return rejectionKey;
      }
    };

    let change = true;
    do {
      change = false;
      walk.simple(ast as any, {
        CallExpression(node) {
          if (!node.callee || !node.arguments) return;
          if (node.arguments.length < 1) return;
          if (
            !node.arguments.every(
              (a) =>
                a.type === "Literal" ||
                a.type === "Identifier" ||
                a.type === "UnaryExpression" ||
                a.type === "BinaryExpression" ||
                a.type === "AssignmentExpression" ||
                a.type === "MemberExpression"
            )
          )
            return;

          const val = evalCall(node);
          if (val === rejectionKey) return;
          if (
            typeof val !== "string" &&
            typeof val !== "number" &&
            typeof val !== "boolean"
          ) {
            return;
          }

          change = true;

          Object.assign(node, {
            type: "Literal",
            value: val,
            raw: JSON.stringify(val)
          });
        }
      });
    } while (change);
  }
});
