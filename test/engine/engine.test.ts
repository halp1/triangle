import { Logger } from "../../src/utils";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "bun:test";

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
      .then((r) =>
        r
          .filter((v) => path.extname(v) === ".ttrmx")
          .map((v) => path.join(__dirname, p, v))
      );
    if (files.length === 0)
      throw new Error(
        "No replays found. Refer to the contributing section of the documentation for information on how to load and extract the Triangle.js replay set."
      );

    const logger = new Logger("Triangle.js");

    const res = await tester.runFiles(files, (event) => {
      if (event.type === "step") {
        if (currentLog) {
          logger.progress(currentLog, 1);
          console.log();
        }
        currentLog = event.data;
        logger.progress(currentLog, 0);
      } else if (event.type === "progress") {
        if (currentLog) logger.progress(currentLog, event.data);
      } else if (event.type === "info") {
        logger.info(event.message);
      }
    });

    expect(res).toBeTrue();
  },
  {
    timeout: 10 * 60 * 1000
  }
);
