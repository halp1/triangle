import { Logger } from "../../../utils";
import { deobfuscate } from "../amber";
import {
  buildObjects,
  evalFunctions,
  evaluateExpressions,
  evaluateIfStatements,
  inlineVariables,
  mergeStrings,
  rebuild,
  removeUnusedDeclarations,
  removeUselessStatements,
  simplifyIfStatements,
  simplifySequences,
  swapComputedKeys,
  swapMembers,
  unwrapBlockStatements,
  unwrapSequences
} from "../amber/plugins";
import { bitsText } from "./bits-text";
import { fastEqualsText } from "./fast-equals-text";
import { msgpackr } from "./msgpackr-text";
import type { splice } from "./splice";

import vm from "node:vm";

import { parse } from "acorn";
import * as walk from "acorn-walk";
import { generate } from "astring";
import { findVariable } from "eslint-utils";

export const compile = async ({
  amadeus,
  bagBody,
  cacheBody,
  constantsBody,
  counterBody,
  engineBody,
  mainBody,
  parentBody,
  spinRulesBody,
  utils,
  version2Var,
  versionVar,
  zenithStaticBody
}: ReturnType<typeof splice>) => {
  const log = new Logger("🎀\u2009Ribbon");

  const context: any = {
    Buffer,
    console,
    performance,
    Response,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    localStorage: {
      items: new Map<string, string>(),
      getItem(key: string) {
        return this.items.get(key);
      },
      setItem(key: string, value: string) {
        return this.items.set(key, value);
      }
    },
    addEventListener: () => {},
    document: { createElement: () => ({}) }
  };

  context.window = context;
  context.self = context;
  context.global = context;
  context.globalThis = context;
  context.tetrio = context;

  let result = await deobfuscate({
    source: amadeus,
    initializerSource: utils,
    initialContext: vm.createContext(context),
    parseConfig: {
      sourceType: "module",
      ecmaVersion: 2022
    },
    onProgress({ step, total }) {
      log.progress(`Building Amber (${step} / ${total})`, step / total);
    },
    preRun: true,
    plugins: [
      evalFunctions(),
      mergeStrings(),
      simplifySequences(),
      unwrapSequences(),
      simplifyIfStatements(),
      rebuild({
        sourceType: "module",
        ecmaVersion: 2022
      }),
      unwrapSequences(),
      buildObjects(),
      swapMembers(),
      evaluateIfStatements(),
      evaluateExpressions(),
      // tetrio shit
      {
        name: "Remove tetrio-specific garbage",
        apply({ ast }) {
          walk.simple(ast as any, {
            CallExpression(node) {
              const expr = /(\w+)\.push\(\1\.shift\(\)\);/;
              if (
                expr.test(generate(node)) ||
                generate(node).includes("setInterval")
              ) {
                Object.assign(node, {
                  type: "EmptyStatement",
                  start: 0,
                  end: 0
                });
              }
            }
          });
        }
      },
      removeUnusedDeclarations(),
      swapComputedKeys(),
      unwrapBlockStatements(),
      swapMembers(),
      inlineVariables(),
      removeUselessStatements(),
      unwrapSequences(),
      mergeStrings(),
      swapComputedKeys(),
      simplifyIfStatements(),
      unwrapSequences(),
      buildObjects(),
      swapMembers(),

      evaluateExpressions(),
      {
        name: "Swap out e for Buffer",
        apply({ ast, getScope, refresh }) {
          try {
            const declaration = "const e = Buffer";
            const declarationNode = parse(declaration, {
              sourceType: "module",
              ecmaVersion: 2022
            }).body[0];
            walk.full(declarationNode as any, (node) => {
              (node as any).range = [node.start, node.end];
            });
            ast.body.splice(0, 0, declarationNode as any);

            refresh();

            walk.simple(ast as any, {
              VariableDeclarator(node) {
                if (node.id.type !== "Identifier" || node.id.name !== "e")
                  return;
                const scope = getScope(node);
                if (!scope) return;

                const def = findVariable(scope as any, node.id);

                def?.references?.forEach((r) => {
                  if (r.isWrite()) return;
                  Object.assign(r.identifier, {
                    type: "Identifier",
                    name: "Buffer"
                  });
                });
                throw new Error("done");
              }
            });
          } catch {
            /* empty */
          }
        }
      },
      {
        name: "Unwrap Control Flow Flattening",
        apply({ ast, getScope, ancestryMap }) {
          const handleLoop = (node: any) => {
            if (node.type === "WhileStatement") {
              if (node.test.type !== "Literal" || node.test.value !== true)
                return;
            } else if (node.type === "ForStatement") {
              if (node.init || node.test || node.update) return;
            } else {
              return;
            }

            if (node.body.type !== "BlockStatement") return;

            const switchStmt = node.body.body.find(
              (s: any) => s.type === "SwitchStatement"
            ) as any;
            if (!switchStmt) return;

            if (
              switchStmt.discriminant.type !== "MemberExpression" ||
              switchStmt.discriminant.property.type !== "UpdateExpression" ||
              switchStmt.discriminant.property.operator !== "++"
            ) {
              return;
            }

            const arrayId = switchStmt.discriminant.object;
            const indexId = switchStmt.discriminant.property.argument;

            if (arrayId.type !== "Identifier" || indexId.type !== "Identifier")
              return;

            const scope = getScope(node);
            if (!scope) return;
            const arrayVar = findVariable(scope as any, arrayId);
            const indexVar = findVariable(scope as any, indexId);

            if (!arrayVar || !indexVar) {
              return;
            }

            const arrayDef = arrayVar.defs[0]?.node as any;

            if (
              !arrayDef ||
              arrayDef.type !== "VariableDeclarator" ||
              !arrayDef.init ||
              arrayDef.init.type !== "CallExpression" ||
              arrayDef.init.callee.property?.name !== "split" ||
              arrayDef.init.callee.object.type !== "Literal"
            ) {
              return;
            }

            const splitString = arrayDef.init.callee.object.value;
            const separator = arrayDef.init.arguments[0]?.value;

            if (
              typeof splitString !== "string" ||
              typeof separator !== "string"
            )
              return;

            const sequence = splitString.split(separator);

            const cases = new Map<string, any[]>();
            for (const c of switchStmt.cases) {
              if (c.test && c.test.type === "Literal") {
                cases.set(String(c.test.value), c.consequent);
              }
            }

            const newBody: any[] = [];
            for (const key of sequence) {
              const statements = cases.get(key);
              if (statements) {
                const filtered = statements.filter(
                  (s: any) => s.type !== "ContinueStatement"
                );
                newBody.push(...filtered);
              }
            }

            const parent = ancestryMap.get(node._id!)?.at(-2);
            if (!parent) {
              return;
            }

            if (parent.type === "BlockStatement" || parent.type === "Program") {
              const body = (parent as any).body;
              const index = body.indexOf(node);
              if (index > -1) {
                body.splice(index, 1, ...newBody);
              }
            }
          };

          walk.simple(ast as any, {
            WhileStatement: handleLoop,
            ForStatement: handleLoop
          });
        }
      },
      removeUnusedDeclarations(),
      inlineVariables(),
      unwrapBlockStatements()
    ]
  });

  const extensionLoader = ".LoadExtensions(";
  const msgpackrName = result
    .slice(result.indexOf(extensionLoader) + extensionLoader.length)
    .slice(0, 1);

  const codecName = result
    .slice(result.indexOf(".SetMsgpackr") - 2)
    .slice(0, 2);

  // some more tetrio-specific initializers
  result =
    [
      `/* eslint-disable */\n// @ts-nocheck`,
      `const { strictShallowEqual } = ${fastEqualsText};`,
      "if (!globalThis.__triangle_buffer__) throw new Error('Buffer polyfill not found');\nconst Buffer = globalThis.__triangle_buffer__;",
      msgpackr + `\nconst ${msgpackrName} = msgpackr();\n`,
      versionVar + version2Var,
      bagBody.replace(/extends [A-Za-z]{1}/, ""),
      spinRulesBody,
      cacheBody,
      constantsBody,
      parentBody,
      engineBody,
      zenithStaticBody.replace(/extends [A-Za-z]{1}/, ""),
      counterBody.replace(/extends [A-Za-z]{1}/, ""),
      mainBody.replace(/extends [A-Za-z]{1}/, ""),
      "export " + bitsText,
      "const n = Bits;\n"
    ].join("\n\n") +
    result.replaceAll(
      /[a-zA-Z]{1}\.strictShallowEqual/g,
      "strictShallowEqual"
    ) +
    `export { ${codecName} as Codec };`;

  return result
    .replaceAll("for (;;)", "while (true)")
    .replaceAll("!0", "true")
    .replaceAll("!1", "false");
};
