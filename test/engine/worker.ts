import { runReplayFile } from "./replay";

declare const self: Worker;

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

self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  try {
    for (const file of event.data.files) {
      await runReplayFile(file);
      self.postMessage({ type: "progress", data: 1 } satisfies WorkerOutput);
    }
    self.postMessage({ type: "done" } satisfies WorkerOutput);
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    } satisfies WorkerOutput);
  }
};
