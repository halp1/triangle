import vm, { type Context } from "node:vm";

import { parse } from "@typescript-eslint/parser";
import type { Node } from "acorn";
import * as walk from "acorn-walk";
import { generate } from "astring";
import { analyze, Reference, Scope, Variable } from "eslint-scope";

declare module "acorn" {
  interface Node {
    _id?: number;
  }
}

export interface Plugin {
  name: string;
  apply(options: {
    ast: ReturnType<typeof parse>;
    ancestryMap: Map<number, Node[]>;
    scopeManager: ReturnType<typeof analyze>;
    getScope: (
      node: Node
    ) => Scope<Variable<Reference>, Reference> | null | undefined;
    refresh: (ast?: ReturnType<typeof parse>) => void;
    context: vm.Context;
  }): ReturnType<typeof parse> | void;
}

export const deobfuscate = async (options: {
  source: string;
  plugins: Plugin[];
  initialContext?: Context;
  initializerSource?: string;
  parseConfig?: Parameters<typeof parse>[1];
  onProgress?: (progress: {
    step: number;
    total: number;
    type: "plugin" | "system";
    description: string;
  }) => void;
  preRun?: boolean;
}): Promise<string> => {
  const context = options.initialContext ?? vm.createContext({});
  vm.runInContext(
    (options.initializerSource ?? "") +
      ";" +
      (options.preRun ? options.source : ""),
    context
  );

  let scopeManager!: ReturnType<typeof analyze>;
  let nodeAncestryMap = new Map<number, Node[]>();

  let ast = parse(
    options.source,
    options.parseConfig ?? {
      sourceType: "module",
      ecmaVersion: 2022
    }
  );

  let refresh = (_ast = ast) => {
    ast = input.ast = _ast;
    scopeManager = analyze(
      _ast as any,
      options.parseConfig ??
        ({
          sourceType: "module",
          ecmaVersion: 2022
        } as any)
    );

    nodeAncestryMap.clear();

    let nextID = 0;

    walk.fullAncestor(ast as any, (node, _, ancestors) => {
      const id = nextID++;
      (node as any)._id = id;
      nodeAncestryMap.set(id, [...ancestors]);
    });
  };

  const input: Parameters<Plugin["apply"]>[0] = {
    ast,
    ancestryMap: nodeAncestryMap,
    scopeManager,
    getScope: (node: Node) =>
      nodeAncestryMap
        .get((node as any)._id)!
        .toReversed()
        .map((n) => scopeManager.acquire(n as any, true))
        .find((s) => s),
    context,
    refresh
  };

  refresh();

  options.plugins.forEach((plugin, idx) => {
    options.onProgress?.({
      step: idx,
      total: options.plugins.length + 1,
      type: "plugin",
      description: plugin.name
    });

    const res = plugin.apply(input);
    if (res) ast = input.ast = res;
    refresh();
  });

  options.onProgress?.({
    step: options.plugins.length + 1,
    total: options.plugins.length + 1,
    type: "system",
    description: "Generating code..."
  });

  return generate(ast as any);
};

export * as plugins from "./plugins";
