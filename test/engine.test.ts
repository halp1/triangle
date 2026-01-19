import { Engine } from "../src/engine";
import type { EngineInitializeParams } from "../src/engine";
import type * as Types from "../src/types";
import type { Replay } from "../src/types";

import fs from "node:fs/promises";
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

export namespace tetrio {
  export namespace replays {
    export const findRounds = (replay: Replay, uid: string) =>
      replay.replay.rounds
        .map((round) => ({
          ...round.find((r) => r.id === uid)!,
          opponents: round
            .map((item) => item.replay.options.gameid)
            .filter(
              (item) =>
                item !== round.find((r) => r.id === uid)!.replay.options.gameid
            )
        }))
        .filter(Boolean);

    export const convert = (
      round: ReturnType<typeof findRounds>[number],
      date: Date = new Date()
    ): EngineInitializeParams => ({
      board: {
        width: round.replay.options.boardheight ?? 10,
        height: round.replay.options.boardwidth ?? 20,
        buffer: 20 // there's always a buffer of 20, don't pull from options
      },
      kickTable: round.replay.options.kickset ?? "SRS+",
      options: {
        comboTable: round.replay.options.combotable ?? "multiplier",
        garbageBlocking:
          round.replay.options.garbageblocking ?? "combo blocking",
        clutch: round.replay.options.clutch ?? true,
        garbageTargetBonus: round.replay.options.garbagetargetbonus ?? "none",
        spinBonuses: round.replay.options.spinbonuses ?? "all-mini+",
        stock: 0
      },
      queue: {
        minLength: 10,
        seed: round.replay.options.seed,
        type: round.replay.options.bagtype ?? ("7-bag" as const)
      },
      garbage: {
        bombs: round.replay.options.usebombs,
        cap: {
          absolute: round.replay.options.garbageabsolutecap ?? 0,
          increase: round.replay.options.garbagecapincrease ?? 0,
          max: round.replay.options.garbagecapmax ?? 40,
          value: round.replay.options.garbagecap ?? 8,
          marginTime: round.replay.options.garbagecapmargin ?? 0
        },
        boardWidth: round.replay.options.boardwidth ?? 10,
        garbage: {
          speed: round.replay.options.garbagespeed ?? 20,
          holeSize: round.replay.options.garbageholesize ?? 1
        },
        messiness: {
          change: round.replay.options.messiness_change ?? 1,
          nosame: round.replay.options.messiness_nosame ?? false,
          timeout: round.replay.options.messiness_timeout ?? 0,
          within: round.replay.options.messiness_inner ?? 0,
          center: round.replay.options.messiness_center ?? false
        },
        multiplier: {
          value: round.replay.options.garbagemultiplier ?? 1,
          increase: round.replay.options.garbageincrease ?? 0.008,
          marginTime: round.replay.options.garbagemargin ?? 10800
        },
        specialBonus: round.replay.options.garbagespecialbonus ?? false,
        openerPhase: round.replay.options.openerphase ?? 0,
        seed: round.replay.options.seed,
        rounding: round.replay.options.roundmode ?? "down"
      },
      gravity: {
        value: round.replay.options.g ?? 0.02,
        increase: round.replay.options.gincrease ?? 0,
        marginTime: round.replay.options.gmargin ?? 0
      },
      handling: {
        arr: round.replay.options.handling?.arr ?? 0,
        das: round.replay.options.handling?.das ?? 6,
        dcd: round.replay.options.handling?.dcd ?? 0,
        sdf: round.replay.options.handling?.sdf ?? 41,
        safelock: round.replay.options.handling?.safelock ?? false,
        cancel: round.replay.options.handling?.cancel ?? false,
        may20g: round.replay.options.handling?.may20g ?? true,
        irs: round.replay.options.handling?.irs ?? "tap",
        ihs: round.replay.options.handling?.ihs ?? "tap"
      },
      b2b: {
        chaining: !round.replay.options.b2bcharging ? true : false,
        charging: round.replay.options.b2bcharging
          ? {
              at: 4,
              base: round.replay.options.b2bcharge_base ?? 3
            }
          : false
      },
      pc: {
        b2b: round.replay.options.allclear_b2b ?? 0,
        garbage: round.replay.options.allclear_garbage ?? 0
      },
      misc: {
        allowed: {
          hardDrop: round.replay.options.allow_harddrop ?? true,
          spin180: round.replay.options.allow180 ?? true,
          hold: round.replay.options.display_hold ?? true
        },
        infiniteHold: round.replay.options.infinite_hold ?? false,
        movement: {
          infinite: false,
          lockResets: round.replay.options.lockresets ?? 15,
          lockTime: 30,
          may20G: round.replay.options.gravitymay20g ?? true
        },
        username: round.replay.options.username,
        date
      },
      multiplayer: {
        opponents: round.opponents,
        passthrough: round.replay.options.passthrough ?? "zero"
      }
    });
  }
}

export namespace runner {
  export const splitFrames = (raw: Types.Game.Replay.Frame[]) => {
    if (raw.length === 0) throw new Error("Replay is empty");
    const totalFrames = raw.at(-1)!.frame + 1;
    const frames: Types.Game.Replay.Frame[][] = [];
    let runningFrameIndex = 0;
    for (let i = 0; i <= totalFrames; i++) {
      frames.push([]);
      while (
        runningFrameIndex < raw.length &&
        raw[runningFrameIndex].frame === i
      ) {
        frames[i].push(raw[runningFrameIndex]);
        runningFrameIndex++;
      }
    }
    return frames;
  };
  export const runThrough = (round: {
    id: string;
    index: number;
    config: EngineInitializeParams;
    frames: Types.Game.Replay.Frame[];
  }) => {
    const frames = splitFrames(round.frames);

    const engine = new Engine(round.config);

    while (engine.frame < frames.length) {
      engine.tick(frames[engine.frame]);
      if (engine.toppedOut && engine.frame < frames.length - 10) {
        console.log(engine.frame, frames.length);
        console.log(engine.text);
        return false;
      }
    }
    return true;
  };
}

export namespace tester {
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

  export const runFiles = async (
    files: string[],
    onProgress: (event: ProgressEvent) => void
  ) => {
    onProgress({
      type: "step",
      data: "Running replays..."
    });
    for (let i = 0; i < files.length; i++) {
      const raw = {
        id: files[i].split("/").at(-1)?.split(".").at(0) ?? "<unknown>",
        replay: JSON.parse(await fs.readFile(files[i], "utf-8")) as {
          replay: Replay;
          user: { id: string };
        }
      };

      const rounds = tetrio.replays
        .findRounds(raw.replay.replay, raw.replay.user.id)
        .map((round, idx) => ({
          id: raw.id,
          index: idx,
          config: tetrio.replays.convert(round, new Date(raw.replay.replay.ts)),
          frames: round.replay.events
        }));

      for (const round of rounds) {
        if (!runner.runThrough(round)) {
          throw new Error(
            `Failure at: https://tetr.io/#R:${round.id}@${round.index + 1}`
          );
        }
      }
      onProgress({
        type: "progress",
        data: (i + 1) / files.length
      });
    }

    return true;
  };
}

let currentLog: string;

test(
  "Replay test",
  async () => {
    const p = "./data/replays";
    const files = await fs
      .readdir(path.join(__dirname, p))
      .then((r) => r.map((v) => path.join(__dirname, p, v)));
    if (files.length === 0)
      throw new Error(
        "No replays found. Refer to the contributing section of the documentation for information on how to load and extract the Triangle.js replay set."
      );

    _console.info(`Testing against ${files.length} replays...`);

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
