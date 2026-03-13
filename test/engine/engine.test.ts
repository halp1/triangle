import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "bun:test";
import chalk from "chalk";

namespace _console {
  const _logger = (() => {
    let lastProgress = false;
    return (name: string) => {
      const log = (
        level: "info" | "warning" | "error" | "success" | "progress",
        name: string,
        newline: boolean = true,
        ...messages: any[]
      ) => {
        const func =
          level === "info"
            ? chalk.blue
            : level === "warning"
              ? chalk.yellow
              : level === "success"
                ? chalk.greenBright
                : level === "progress"
                  ? chalk.magenta
                  : chalk.red;

        const output = `${func(`[${name}]`)} ${messages
          .map((m) => (typeof m === "string" ? m : JSON.stringify(m)))
          .join(" ")}`;

        if (newline) {
          console.log(`${lastProgress ? "\n" : ""}${output}`);
          lastProgress = false;
        } else {
          process.stdout.write(`${lastProgress ? "\r" : ""}${output}`);
          lastProgress = true;
        }
      };

      return {
        log: (...messages: any[]) => log("info", name, true, ...messages),
        warn: (...messages: any[]) => log("warning", name, true, ...messages),
        error: (...messages: any[]) => log("error", name, true, ...messages),
        success: (...messages: any[]) =>
          log("success", name, true, ...messages),
        info: (...messages: any[]) => log("info", name, true, ...messages),

        progress: (message: string, progress: number) => {
          const cols = process.stdout.columns || 80;
          const namePlain = `[${name}]`;
          const prefixPlain = `${namePlain} ${message}`;
          const contentPlain =
            prefixPlain.length >= cols
              ? prefixPlain.slice(0, cols)
              : prefixPlain + " ".repeat(cols - prefixPlain.length);

          const p = Math.max(0, Math.min(1, progress));
          const filledLength = Math.round(p * cols);

          const nameLen = namePlain.length + 0;
          const nameFilledOverlap = Math.max(
            0,
            Math.min(filledLength, nameLen)
          );
          const nameEmptyOverlap = Math.max(0, nameLen - nameFilledOverlap);

          const filledRaw = contentPlain.slice(0, filledLength);
          const emptyRaw = contentPlain.slice(filledLength);

          let filledRendered = "";
          if (filledLength === 0) {
            filledRendered = "";
          } else {
            if (nameFilledOverlap > 0) {
              const namePart = filledRaw.slice(0, nameFilledOverlap);
              const rest = filledRaw.slice(nameFilledOverlap);
              filledRendered =
                chalk.bgWhite.magenta(namePart) + chalk.bgWhite(rest);
            } else {
              filledRendered = chalk.bgWhite(filledRaw);
            }
          }

          let emptyRendered = "";
          if (emptyRaw.length === 0) {
            emptyRendered = "";
          } else {
            if (nameEmptyOverlap > 0) {
              const namePart = emptyRaw.slice(0, nameEmptyOverlap);
              const rest = emptyRaw.slice(nameEmptyOverlap);
              emptyRendered = chalk.magenta(namePart) + rest;
            } else {
              emptyRendered = emptyRaw;
            }
          }

          process.stdout.write("\r" + filledRendered + emptyRendered);
          lastProgress = true;
        }
      };
    };
  })();

  export const logger = _logger;
  const defaultLogger = _logger("Triangle.js");
  export const log = defaultLogger.log;
  export const warn = defaultLogger.warn;
  export const error = defaultLogger.error;
  export const success = defaultLogger.success;
  export const info = defaultLogger.info;
  export const progress = defaultLogger.progress;
}

export namespace tester {
  type WorkerInput = {
    files: string[];
  };

  type WorkerOutput =
    | {
        type: "progress";
        data: number;
      }
    | {
        type: "done";
      }
    | {
        type: "error";
        error: string;
      };

  export type ProgressEvent =
    | {
        type: "progress";
        data: number;
      }
    | {
        type: "step";
        data: string;
      }
    | {
        type: "info";
        message: string;
      };

  const detectThreadCount = (fileCount: number) => {
    const fromNavigator = globalThis.navigator?.hardwareConcurrency;
    const available =
      typeof fromNavigator === "number" && Number.isFinite(fromNavigator)
        ? fromNavigator
        : typeof os.availableParallelism === "function"
          ? os.availableParallelism()
          : os.cpus().length;

    return Math.max(1, Math.min(fileCount, Math.max(1, available - 1)));
  };

  const splitWork = (files: string[], workerCount: number) => {
    const buckets = Array.from({ length: workerCount }, () => [] as string[]);
    for (let i = 0; i < files.length; i++) {
      buckets[i % workerCount].push(files[i]);
    }
    return buckets.filter((bucket) => bucket.length > 0);
  };

  export const runFiles = async (
    files: string[],
    onProgress: (event: ProgressEvent) => void
  ) => {
    const threadCount = detectThreadCount(files.length);
    onProgress({
      type: "info",
      message: `Testing against ${files.length} replays using ${threadCount} worker${threadCount === 1 ? "" : "s..."}`
    });

    onProgress({
      type: "step",
      data: "Running replays..."
    });

    const fileGroups = splitWork(files, threadCount);
    const workerUrl = new URL("./worker.ts", import.meta.url).href;

    await new Promise<void>((resolve, reject) => {
      let completedFiles = 0;
      let completedWorkers = 0;
      let settled = false;
      const workers: Worker[] = [];

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        for (const worker of workers) {
          worker.terminate();
        }
        reject(error);
      };

      for (const group of fileGroups) {
        const worker = new Worker(workerUrl);
        workers.push(worker);

        worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
          if (settled) return;

          if (event.data.type === "progress") {
            completedFiles += event.data.data;
            onProgress({
              type: "progress",
              data: completedFiles / files.length
            });
            return;
          }

          if (event.data.type === "done") {
            completedWorkers += 1;
            worker.terminate();
            if (completedWorkers === fileGroups.length) {
              settled = true;
              resolve();
            }
            return;
          }

          fail(new Error(event.data.error));
        };

        worker.onerror = (event) => {
          const message =
            event.error instanceof Error
              ? event.error.message
              : typeof event.message === "string"
                ? event.message
                : "Worker failed";
          fail(new Error(message));
        };

        worker.postMessage({ files: group } satisfies WorkerInput);
      }
    });

    return true;
  };
}

let currentLog: string;

test(
  "Replay test",
  async () => {
    const p = "../data/replays";
    const files = await fs
      .readdir(path.join(__dirname, p))
      .then((r) => r.map((v) => path.join(__dirname, p, v)));
    if (files.length === 0)
      throw new Error(
        "No replays found. Refer to the contributing section of the documentation for information on how to load and extract the Triangle.js replay set."
      );

    const res = await tester.runFiles(files, (event) => {
      if (event.type === "step") {
        if (currentLog) {
          _console.progress(currentLog, 1);
          console.log();
        }
        currentLog = event.data;
        _console.progress(currentLog, 0);
      } else if (event.type === "progress") {
        if (currentLog) _console.progress(currentLog, event.data);
      } else if (event.type === "info") {
        _console.info(event.message);
      }
    });

    expect(res).toBeTrue();
  },
  {
    timeout: 10 * 60 * 1000
  }
);
