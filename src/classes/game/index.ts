import {
  Engine,
  type EngineInitializeParams,
  type EngineSnapshot,
  type IncomingGarbage,
  type Rotation
} from "../../engine";
import { constants } from "../../engine/constants";
import type { Events, Game as GameTypes } from "../../types";
import { Client } from "../client";
import { Self } from "./self";

import chalk from "chalk";

export const moveElementToFirst = <T>(arr: T[], n: number) => [
  arr[n],
  ...arr.slice(0, n),
  ...arr.slice(n + 1)
];

export class Game {
  #client: Client;
  #listeners: Parameters<Client["on"]>[] = [];

  /** Data on all players in game, including the client */
  public players: {
    name: string;
    gameid: number;
    userid: string;
    engine: Engine;
    queue: GameTypes.Replay.Frame[];
  }[] = [];

  /** The raw game config for all players, (possibly) including the client's own game config */
  public rawPlayers: GameTypes.Ready["players"];

  /** The client's own game handler */
  public self?: Self;

  public get opponents() {
    return this.players.filter((p) => p.userid !== this.#client.user.id);
  }

  /** The Frames Per Second of the TETR.IO engine */
  static fps = 60;

  /** @hideconstructor */
  constructor(client: Client, players: GameTypes.Ready["players"]) {
    this.#client = client;

    const self = players.find((p) => p.userid === client.user.id);

    if (self) {
      this.self = new Self(client, players);
    }
    this.rawPlayers = players;

    this.#init();
  }

  /**
   * @internal
   * For internal use only.
   */
  static log(
    msg: string,
    { level = "info" }: { level: "info" | "warning" | "error" } = {
      level: "info"
    }
  ) {
    const func =
      level === "info"
        ? chalk.blue
        : level === "warning"
          ? chalk.yellow
          : chalk.red;
    console.log(`${func("[Triangle.JS]")}: ${msg}`);
  }

  #listen<T extends keyof Events.in.all>(
    event: T,
    cb: (data: Events.in.all[T]) => void,
    once = false
  ) {
    this.#listeners.push([event, cb] as any);
    if (once) {
      this.#client.once(event, cb);
    } else {
      this.#client.on(event, cb);
    }
  }

  /**
   * @internal
   * Kill the game. This is called automatically by the Room class when a game ends/is aborted, you don't need to use this.
   */
  destroy(): undefined {
    this.self?.destroy();

    this.#listeners.forEach((l) => this.#client.off(l[0], l[1]));

    this.players.forEach((engine) => engine.engine.events.removeAllListeners());

    delete this.#client.game;
  }

  #init() {
    this.#client.ribbon.fasterPing = true;

    this.self?.init();

    this.players = this.rawPlayers.map((o) => ({
      name: o.options.username,
      userid: o.userid,
      gameid: o.gameid,
      engine: Game.createEngine(o.options, o.gameid, this.rawPlayers),
      queue: []
    }));

    this.#listen("game.replay", ({ gameid, frames }) => {
      const game = this.players.find((player) => player.gameid === gameid);
      if (!game || game.engine.toppedOut) return false;

      game.queue.push(...frames);
      while (game.queue.some((f) => f.frame > game.engine.frame)) {
        const frames: GameTypes.Replay.Frame[] = [];
        while (
          game.queue.length > 0 &&
          game.queue[0].frame <= game.engine.frame
        ) {
          frames.push(game.queue.shift()!);
        }
        game.engine.tick(frames);
      }
    });

    this.#listen("game.replay.state", ({ gameid, data }) => {
      const player = this.players.find((g) => g.gameid === gameid);
      if (!player) return; // should never happen, in theory
      if (data === "early") {
        // todo: what to do here?
      } else if (data === "wait") {
        // todo: what to do here?
      } else {
        player.engine.fromSnapshot(
          Game.snapshotFromState(
            data.frame,
            player.engine.initializer,
            data.game
          )
        );
      }
    });
  }

  spectate(gameid: number[]): void;
  spectate(userid: "all"): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  spectate(userid: String[]): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  spectate(targets: number[] | "all" | String[]) {
    if (targets === "all") {
      this.players.forEach((p) => {
        this.#client.emit("game.scope.start", p.gameid);
      });
    } else if (Array.isArray(targets)) {
      if (targets.length === 0) return;
      if (typeof targets[0] === "string") {
        const useridTargets = targets as string[];
        this.players.forEach((p) => {
          if (useridTargets.includes(p.userid)) {
            this.#client.emit("game.scope.start", p.gameid);
          }
        });
      } else {
        this.players
          .filter((p) => (targets as number[]).includes(p.gameid))
          .forEach((p) => {
            this.#client.emit("game.scope.start", p.gameid);
          });
      }
    } else {
      throw new Error("Invalid spectate targets");
    }
  }

  unspectate(gameid: number[]): void;
  unspectate(userid: "all"): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  unspectate(userid: String[]): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  unspectate(targets: number[] | "all" | String[]) {
    if (targets === "all") {
      this.players.forEach((p) => {
        this.#client.emit("game.scope.end", p.gameid);
      });
    } else if (Array.isArray(targets)) {
      if (targets.length === 0) return;
      if (typeof targets[0] === "string") {
        const useridTargets = targets as string[];
        this.players.forEach((p) => {
          if (useridTargets.includes(p.userid)) {
            this.#client.emit("game.scope.end", p.gameid);
          }
        });
      } else {
        this.players
          .filter((p) => (targets as number[]).includes(p.gameid))
          .forEach((p) => {
            this.#client.emit("game.scope.end", p.gameid);
          });
      }
    } else {
      throw new Error("Invalid unspectate targets");
    }
  }

  /**
   * @internal
   */
  static createEngine(
    options: GameTypes.ReadyOptions,
    gameid: number,
    players: GameTypes.Ready["players"]
  ): Engine {
    return new Engine({
      multiplayer: {
        opponents: players.map((o) => o.gameid).filter((id) => id !== gameid),
        passthrough: options.passthrough
      },
      board: {
        width: options.boardwidth,
        height: options.boardheight,
        buffer: 20 // there is always a buffer of 20 over the visible board
      },
      kickTable: options.kickset as any,
      options: {
        comboTable: options.combotable as any,
        garbageBlocking: options.garbageblocking as any,
        clutch: options.clutch,
        garbageTargetBonus: options.garbagetargetbonus,
        spinBonuses: options.spinbonuses,
        stock: options.stock
      },
      queue: {
        minLength: 31,
        seed: options.seed,
        type: options.bagtype as any
      },

      garbage: {
        cap: {
          absolute: options.garbageabsolutecap,
          increase: options.garbagecapincrease,
          max: options.garbagecapmax,
          value: options.garbagecap,
          marginTime: options.garbagecapmargin
        },
        multiplier: {
          value: options.garbagemultiplier,
          increase: options.garbageincrease,
          marginTime: options.garbagemargin
        },
        boardWidth: options.boardwidth,
        garbage: {
          speed: options.garbagespeed,
          holeSize: options.garbageholesize
        },
        messiness: {
          change: options.messiness_change,
          nosame: options.messiness_nosame,
          timeout: options.messiness_timeout,
          within: options.messiness_inner,
          center: options.messiness_center ?? false
        },

        bombs: options.usebombs,

        seed: options.seed,
        rounding: options.roundmode,
        openerPhase: options.openerphase,
        specialBonus: options.garbagespecialbonus
      },
      pc: options.allclears
        ? {
            garbage: options.allclear_garbage,
            b2b: options.allclear_b2b
          }
        : false,
      b2b: {
        chaining: options.b2bchaining,
        charging: options.b2bcharging
          ? { at: options.b2bcharge_at, base: options.b2bcharge_base }
          : false
      },
      gravity: {
        value: options.g,
        increase: options.gincrease,
        marginTime: options.gmargin
      },
      misc: {
        movement: {
          infinite: options.infinite_movement,
          lockResets: options.lockresets,
          lockTime: options.locktime,
          may20G: options.gravitymay20g
        },
        allowed: {
          spin180: options.allow180,
          hardDrop: options.allow_harddrop,
          hold: options.display_hold
        },
        infiniteHold: options.infinite_hold,
        username: options.username,
        date: new Date()
      },
      handling: options.handling
    });
  }

  /**
   * @internal
   */
  static snapshotFromState(
    frame: number,
    config: EngineInitializeParams,
    state: GameTypes.State
  ): EngineSnapshot {
    return {
      board: state.board.toReversed(),
      // TODO: actual connected board
      connectedBoard: state.board
        .toReversed()
        .map((row) =>
          row.map((square) =>
            square ? { mino: square, connection: 0b0_0000 } : null
          )
        ),
      falling: {
        aox: 0,
        aoy: 0,
        fallingRotations: 0,
        totalRotations: state.totalRotations,
        highestY: state.falling.hy,
        irs: state.falling.irs,
        ihs: false,
        keys: state.falling.keys,
        location: [state.falling.x, state.falling.y],
        locking: state.falling.locking,
        lockResets: state.falling.lockresets,
        rotation: state.falling.r as Rotation,
        rotResets: state.falling.rotresets,
        safeLock: state.falling.safelock,
        symbol: state.falling.type
      },
      frame,
      garbage: {
        hasChangedColumn: state.haschangedcolumn,
        lastColumn: state.lastcolumn,
        lastReceivedCount: state.lastreceivedcount,
        lastTankTime: state.lasttanktime,
        queue: state.impendingdamage.map(
          (g): IncomingGarbage => ({
            amount: g.amt,
            cid: g.cid!,
            gameid: g.gameid!,
            size: g.size,
            confirmed: !!state.waitingframes.find(
              (wf) => wf.type === "incoming-attack-hit" && wf.data === g.id
            ),
            frame:
              state.waitingframes.find(
                (wf) => wf.type === "incoming-attack-hit" && wf.data === g.id
              )?.target ?? Infinity - config.garbage.garbage.speed
          })
        ),
        seed: state.rngex,
        sent: state.stats.garbage.sent
      },
      glock: state.glock,
      hold: state.hold,
      holdLocked: state.holdlocked,
      ige: {
        iid: state.interactionid,
        players: [
          ...new Set([
            ...Object.keys(state.garbageacknowledgements.incoming),
            ...Object.keys(state.garbageacknowledgements.outgoing)
          ])
        ].map((p) => ({
          incoming: state.garbageacknowledgements.incoming[parseInt(p)] ?? 0,
          outgoing:
            state.garbageacknowledgements.outgoing[parseInt(p)]?.map((o) => ({
              iid: o.iid,
              amount: o.amt
            })) ?? []
        }))
      },
      input: {
        lShift: state.lShift,
        rShift: state.rShift,
        firstInputTime: state.firstInputTime,
        keys: {
          hold: state.inputHold,
          rotate180: state.inputRotate180,
          rotateCCW: state.inputRotateCCW,
          rotateCW: state.inputRotateCW,
          softDrop: state.inputSoftdrop
        },
        lastPieceTime: state.lastpiecetime,
        lastShift: state.lastshift,
        time: state.time
      },
      lastSpin:
        state.falling.flags & constants.flags.ROTATION_SPIN
          ? "normal"
          : !(
                ~state.falling.flags &
                (constants.flags.ROTATION_SPIN | constants.flags.ROTATION_MINI)
              )
            ? "mini"
            : "none",
      lastWasClear: state.lastwasclear,
      resCache: {
        pieces: 0,
        garbage: {
          sent: [],
          received: []
        },
        keys: [],
        lastLock: 0
      },
      spike: {
        count: state.spike.count,
        timer: state.spike.timer
      },
      state: state.falling.flags,
      stats: {
        garbage: {
          sent: state.stats.garbage.sent,
          attack: state.stats.garbage.attack,
          cleared: state.stats.garbage.cleared,
          receive: state.stats.garbage.received
        },
        b2b: state.stats.btb,
        combo: state.stats.combo,
        lines: state.stats.lines,
        pieces: state.stats.piecesplaced
      },
      stock: state.stock,
      subframe: state.subframe,
      targets: state.targets,
      queue: {
        bag: {
          extra: state.bagex,
          id: state.bagid,
          lastGenerated: state.lastGenerated,
          rng: state.rng
        },
        value: state.bag.slice()
      }
    };
  }
}

export * from "./types";
