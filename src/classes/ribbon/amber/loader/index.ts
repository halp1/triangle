import { Logger, version } from "../../../../utils";
import { core } from "../../../../utils/api/core";
import { type Server } from "../../../../utils/api/server";
import { compile } from "./compile";
import { splice } from "./splice";
import type { Codec } from "./types";
import { Buffer } from "buffer/index.js";

import fsSync from "node:fs";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

let Amber: Awaited<ReturnType<typeof amber>> | null = null;

let inProgress: null | Promise<void> = null;

declare global {
  var __triangle_buffer__: typeof Buffer;
}

globalThis.__triangle_buffer__ = Buffer;

export const amber = async (
  userAgent: string,
  options: {
    global: boolean;
  } = { global: false }
): Promise<Codec> => {
  if (inProgress) await inProgress;

  if (Amber && options.global) return Amber;

  const logger = new Logger("Triangle.js");

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
  const fileName = `amber-${version}-${serverVersion.signature.version}-${serverVersion.signature.client.build.id}.mjs`;

  let target = path.join(triangleDir, fileName);

  if (
    !(await fs
      .access(target, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false))
  ) {
    try {
      logger.warn("TETR.IO update found. Extracting new packer...");
      if (!fsSync.existsSync(triangleDir)) {
        await fs.mkdir(triangleDir, { recursive: true });
      }

      let text: string;
      try {
        const response = await fetch("https://tetr.io/js/tetrio.js");
        text = await response.text();
      } catch (e: any) {
        e.__networkError = true;
        throw e;
      }

      const res = await compile(splice(text));

      // empty triangle folder
      const files = await fs.readdir(triangleDir);
      for (const file of files) {
        await fs.rm(path.join(triangleDir, file), {
          recursive: true,
          force: true
        });
      }

      await fs.writeFile(path.join(triangleDir, fileName), res);

      logger.log(
        `tetrio.js @${serverVersion.signature.version}/${serverVersion.signature.client.commit.id} patched`
      );
    } catch (e: any) {
      if (e.__networkError) {
        throw new Error("Network error: Failed to download tetrio.js.");
      }

      logger.warn("Failed to extract new codec. Attempting to use backup...");

      // find a backup file

      const files = await fs.readdir(triangleDir);

      const backup = files
        .filter((file) => file.startsWith("amber-") && file.endsWith(".mjs"))
        .sort((a, b) => {
          const aVersion = a.split("-")[2];
          const bVersion = b.split("-")[2];
          return aVersion.localeCompare(bVersion);
        })
        .pop();

      if (!backup) {
        throw new Error(
          'No backup codec found. Try temporarily switching your transport to "json":\nawait Client.create({ ribbon: { transport: "json" } })'
        );
      }

      logger.warn(
        `Using backup codec from version ${backup.split("-")[2]}. This may cause issues if the server update included codec changes.\nIf you encounter issues, try temporarily switching your transport to "json":\nawait Client.create({ ribbon: { transport: "json" } })`
      );

      target = path.join(triangleDir, backup);
    }
  }

  const { Codec } = await import(target);

  Amber = Codec;

  // @ts-expect-error it thinks resolveInProgress is always null, but it's not (assigned in Promise constructor)
  resolveInProgress?.();
  return Amber!;
};
