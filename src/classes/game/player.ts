import { Game } from ".";
import type { Engine } from "../../engine";
import type { Game as GameTypes } from "../../types";
import type { Events } from "../../types";
import type { Client } from "../client";
import type { Hook } from "../client/hook";

import { reject } from "lodash";

export enum SpectatingState {
  Inactive,
  Waiting,
  Active
}

/**
 * The spectating strategy to use when spectating a player.
 * - `smooth`: The engine will tick on a timer, ensuring smooth gameplay (similar to watching live games on TETR.IO). Data may not be as up-to-date.
 * - `instant`: The engine will tick as soon as data is received, ensuring the most up-to-date gameplay. Gameplay may appear choppy.
 */
export type SpectatingStrategy = "smooth" | "instant";

export class Player {
  name: string;
  gameid: number;
  userid: string;
  engine: Engine;
  /** Whether the player is currently receiving replay frames (actively spectated) */
  state: SpectatingState = SpectatingState.Inactive;

  #client: Client;
  #hook: Hook<Events.in.all>;
  #queue: GameTypes.Replay.Frame[] = [];
  #resolvers: [() => void, (error: string) => void][] = [];

  #strategy: SpectatingStrategy;

  constructor(
    client: Client,
    strategy: SpectatingStrategy,
    data: GameTypes.Ready["players"][number],
    rawPlayers: GameTypes.Ready["players"]
  ) {
    this.name = data.options.username;
    this.gameid = data.gameid;
    this.userid = data.userid;
    this.engine = Game.createEngine(data.options, data.gameid, rawPlayers);

    this.#client = client;
    this.#hook = client.hook();
    this.#strategy = strategy;

    this.#hook.on("game.replay.state", ({ gameid, data }) => {
      if (gameid !== this.gameid) return;

      this.#resolvers.forEach(([r]) => r());
      this.#resolvers = [];
      this.state = SpectatingState.Active;

      if (data === "early") {
        // todo: what to do here?
      } else if (data === "wait") {
        // todo: what to do here?
      } else {
        this.engine.fromSnapshot(
          Game.snapshotFromState(data.frame, this.engine.initializer, data.game)
        );
      }
    });

    this.#hook.on("game.replay", ({ gameid, frames }) => {
      if (this.state !== SpectatingState.Active) return;
      if (gameid !== this.gameid) return;
      if (this.engine.toppedOut) return;

      this.#queue.push(...frames);
    });
  }

  spectate() {
    return new Promise<void>((resolve) => {
      if (this.state === SpectatingState.Active) return;
      if (this.state === SpectatingState.Waiting)
        return this.#resolvers.push([
          () => resolve(),
          (error) => reject(error)
        ]);
      this.state = SpectatingState.Waiting;

      this.#client.emit("game.scope.start", this.gameid);
      this.#resolvers.push([() => resolve(), (error) => reject(error)]);
    });
  }

  unspectate() {
    if (this.state === SpectatingState.Inactive) return;
    this.#client.emit("game.scope.end", this.gameid);
    this.state = SpectatingState.Inactive;
    this.#queue = [];
  }

  destroy() {
    this.#resolvers.forEach(([_, r]) =>
      r("Game ended before spectating could begin")
    );

    if (this.state !== SpectatingState.Inactive) this.unspectate();

    this.#resolvers = [];
    this.#hook.destroy();
    this.#queue = [];
    this.engine.events.removeAllListeners();
  }

  #tickOnce() {
    const frames: GameTypes.Replay.Frame[] = [];
    while (
      this.#queue.length > 0 &&
      this.#queue[0].frame <= this.engine.frame
    ) {
      frames.push(this.#queue.shift()!);
    }
    this.engine.tick(frames);
  }

  /** @internal */
  _tick() {
    if (this.state !== SpectatingState.Active) return;

    if (this.#strategy === "instant") {
      while (this.#queue.some((f) => f.frame > this.engine.frame)) {
        this.#tickOnce();
      }
    } else if (this.#strategy === "smooth") {
      if (this.#queue.length === 0) return;

      const lastFrame = this.#queue[this.#queue.length - 1].frame;

      if (this.engine.frame < lastFrame - 20) {
        // if we're behind, skip ahead
        while (
          this.#queue.some((f) => f.frame > this.engine.frame) &&
          this.engine.frame < lastFrame - 20
        ) {
          this.#tickOnce();
        }
      }

      if (this.#queue.some((f) => f.frame > this.engine.frame)) {
        this.#tickOnce();
      }
    }
  }

  /** @internal */
  set _strategy(strategy: SpectatingStrategy) {
    this.#strategy = strategy;
  }

  /** @internal */
  get _strategy() {
    return this.#strategy;
  }
}
