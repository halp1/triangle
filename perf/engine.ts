import { Engine } from "../src/engine";
import type { EngineInitializeParams } from "../src/engine";
import type * as Types from "../src/types";
import type { Replay } from "../src/types";
import { Logger } from "../src/utils";

import fs from "node:fs/promises";
import path from "node:path";

const logger = new Logger("Triangle.js");

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
          hold: round.replay.options.display_hold ?? true,
          retry: round.replay.options.can_retry ?? false,
          undo: round.replay.options.can_undo ?? false
        },
        infiniteHold: round.replay.options.infinite_hold ?? false,
        movement: {
          infinite: false,
          lockResets: round.replay.options.lockresets ?? 15,
          lockTime: round.replay.options.locktime ?? 30,
          may20G: round.replay.options.gravitymay20g ?? true
        },
        username: round.replay.options.username,
        stride: round.replay.options.stride ?? false,
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

		const length = Math.min(files.length, 100);
    console.time("Run through 100 files");

    for (let i = 0; i < length; i++) {
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
        data: (i + 1) / length
      });
    }
		
    console.timeEnd("Run through 100 files");

    return true;
  };
}

let currentLog: string;

const p = "../test/data/replays";
const files = await fs
  .readdir(path.join(__dirname, p))
  .then((r) => r.map((v) => path.join(__dirname, p, v)));
if (files.length === 0)
  throw new Error(
    "No replays found. Refer to the contributing section of the documentation for information on how to load and extract the Triangle.js replay set."
  );

logger.info(`Testing against ${files.length} replays...`);

await tester.runFiles(files, (event) => {
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
