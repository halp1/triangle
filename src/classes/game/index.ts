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

  /** Data on all players in game, including the client. Note that the client's engine data is only the data acknowledged by the server, not the most recent gameplay information. */
  players: {
    name: string;
    gameid: number;
    userid: string;
    engine: Engine;
    /** Queue of unprocessed replay frames for this player. Do not modify. */
    queue: GameTypes.Replay.Frame[];
    /** Whether the player is currently receiving replay frames (actively spectated) */
    spectating: boolean;
  }[] = [];

  /** The raw game config for all players, (possibly) including the client's own game config */
  rawPlayers: GameTypes.Ready["players"];

  /** The client's own game handler */
  self?: Self;

  get opponents() {
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

    this.#client.ribbon.fasterPing = false;

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
      queue: [],
      spectating: false
    }));

    this.#listen("game.replay", ({ gameid, frames }) => {
      const game = this.players.find((player) => player.gameid === gameid);
      if (!game || game.engine.toppedOut) return;

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

  #spectate(player: Game["players"][number] | number) {
    const p =
      typeof player === "number"
        ? this.players.find((p) => p.gameid === player)
        : player;
    if (!p || p.spectating) return;
    this.#client.emit("game.scope.start", p.gameid);
    p.spectating = true;
  }

  #unspectate(player: Game["players"][number] | number) {
    const p =
      typeof player === "number"
        ? this.players.find((p) => p.gameid === player)
        : player;
    if (!p || !p.spectating) return;
    this.#client.emit("game.scope.end", p.gameid);
    p.spectating = false;
  }

  /**
   * Spectate one or more players by their game ID or user ID, or spectate all players in the game.
   * @param gameid - An array of game IDs to spectate.
   * @example
   * ```ts
   * // Spectate a player by game ID
   * client.game!.spectate([12344]);
   * ```
   */
  spectate(gameid: number[]): void;
  /**
   * Spectate one or more players by their game ID or user ID, or spectate all players in the game.
   * @param targets - The string "all" to spectate all players.
   * @example
   * ```ts
   * // Spectate all players in the game
   * client.game!.spectate("all");
   * ```
   */
  spectate(targets: "all"): void;
  /**
   * Spectate one or more players by their game ID or user ID, or spectate all players in the game.
   * @param userid - An array of user IDs to spectate.
   * @example
   * ```ts
   * // Spectate a player by user ID
   * client.game!.spectate(["646f633d276f42a80ba44304"]);
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  spectate(userid: String[]): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  spectate(targets: number[] | "all" | String[]) {
    if (targets === "all") {
      this.players.forEach((p) => this.#spectate(p));
    } else if (Array.isArray(targets)) {
      if (targets.length === 0) return;
      if (typeof targets[0] === "string") {
        const useridTargets = targets as string[];
        this.players
          .filter((p) => useridTargets.includes(p.userid))
          .forEach((p) => this.#spectate(p));
      } else {
        const gameidTargets = targets as number[];
        this.players
          .filter((p) => gameidTargets.includes(p.gameid))
          .forEach((p) => this.#spectate(p));
      }
    } else {
      throw new Error("Invalid spectate targets");
    }
  }

  /**
   * Stop spectating one or more players by their game ID or user ID, or stop spectating all players in the game.
   * @param gameid - An array of game IDs to stop spectating.
   * @example
   * ```ts
   * // Stop spectating a player by game ID
   * client.game!.unspectate([12344]);
   * ```
   */
  unspectate(gameid: number[]): void;
  /**
   * Stop spectating one or more players by their game ID or user ID, or stop spectating all players in the game.
   * @param userid - The string "all" to stop spectating all players.
   * @example
   * ```ts
   * // Stop spectating all players in the game
   * client.game!.unspectate("all");
   * ```
   */
  unspectate(userid: "all"): void;
  /**
   * Stop spectating one or more players by their game ID or user ID, or stop spectating all players in the game.
   * @param userid - An array of user IDs to stop spectating.
   * @example
   * ```ts
   * // Stop spectating a player by user ID
   * client.game!.unspectate(["646f633d276f42a80ba44304"]);
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  unspectate(userid: String[]): void;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  unspectate(targets: number[] | "all" | String[]) {
    if (targets === "all") {
      this.players.forEach((p) => this.#unspectate(p));
    } else if (Array.isArray(targets)) {
      if (targets.length === 0) return;
      if (typeof targets[0] === "string") {
        const useridTargets = targets as string[];
        this.players
          .filter((p) => useridTargets.includes(p.userid))
          .forEach((p) => this.#unspectate(p));
      } else {
        const gameidTargets = targets as number[];
        this.players
          .filter((p) => gameidTargets.includes(p.gameid))
          .forEach((p) => this.#unspectate(p));
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
        ]
          .map((p) => parseInt(p))
          .map((p) => ({
            incoming: state.garbageacknowledgements.incoming[p] ?? 0,
            outgoing:
              state.garbageacknowledgements.outgoing[p]?.map((o) => ({
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
export * from "./self";
export * from "./player";
