import { Logger, version } from "../../../utils";
import { core } from "../../../utils/api/core";
import { type Server } from "../../../utils/api/server";
import { compile } from "./compile";
import { splice } from "./splice";
import type { Codec } from "./types";
import { Buffer } from "buffer/index.js";

import fsSync from "node:fs";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

let Amber: Awaited<ReturnType<typeof amber>> | null = null;

const logger = new Logger("🎀\u2009Ribbon");

let inProgress: null | Promise<void> = null;

declare global {
  var __triangle_buffer__: typeof Buffer;
}

export const amber = async (
  userAgent: string,
  options: {
    global: boolean;
  } = { global: false }
): Promise<Codec> => {
  if (inProgress) await inProgress;

  if (Amber && options.global) return Amber;

  let resolveInProgress: (() => void) | null = null;

  inProgress ??= new Promise((resolve) => {
    resolveInProgress = resolve;
  });

  const serverVersion = await core({
    userAgent,
    token: "",
    turnstile: null
  }).get<Server.Environment>({
    uri: "server/environment"
  });
  if (serverVersion.success === false) {
    throw new Error(serverVersion.error.msg);
  }

  const triangleDir = path.join(homedir(), ".trianglejs");
  const fileName = `amber-${version}-${serverVersion.signature.client.build.id}.mjs`;

  const target = path.join(triangleDir, fileName);

  if (
    !(await fs
      .access(target, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false))
  ) {
    logger.warn("TETR.IO update found. Extracting new packer...");
    if (!fsSync.existsSync(triangleDir)) {
      await fs.mkdir(triangleDir, { recursive: true });
    }

    // empty triangle folder
    const files = await fs.readdir(triangleDir);
    for (const file of files) {
      await fs.rm(path.join(triangleDir, file), {
        recursive: true,
        force: true
      });
    }

    const response = await fetch("https://tetr.io/js/tetrio.js");
    const buffer = Buffer.from(await response.arrayBuffer());

    await fs.writeFile(
      path.join(triangleDir, fileName),
      await compile(splice(buffer.toString()))
    );

    logger.log(`amber @${serverVersion.signature.version} patched`);
  }

  globalThis.__triangle_buffer__ = Buffer;

  const { Codec } = await import(target);

  Amber = Codec;

  // @ts-expect-error it thinks resolveInProgress is always null, but it's not (assigned in Promise constructor)
  resolveInProgress?.();
  return Amber!;
};
