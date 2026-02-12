import { Game, moveElementToFirst } from ".";
import type { Engine } from "../../engine";
import type { Game as GameTypes } from "../../types";
import type { Events } from "../../types";
import type { BotWrapper } from "../../utils";
import type { Client } from "../client";
import type { Hook } from "../client/hook";
import { getFullFrame } from "./utils";

export class Self {
  #client: Client;
  #hook: Hook<Events.in.all>;
  #frameQueue: GameTypes.Replay.Frame[] = [];
  #incomingGarbage: (GameTypes.Replay.Frames.IGEFrame & { frame: number })[] =
    [];
  #timeout: NodeJS.Timeout | null = null;
  #messageQueue: GameTypes.Client.Events[] = [];
  #target: GameTypes.Target = { strategy: "even" };
  #pauseIGEs = false;
  #forcePauseIGEs = false;
  #igeQueue: GameTypes.IGE[] = [];
  #slowTickWarning = false;
  #players: GameTypes.Ready["players"];
  // @ts-expect-error
  // eslint-disable-next-line no-unused-private-class-members
  #isPractice = false;
  #over = false;

  /** The client's engine */
  engine!: Engine;
  /** The client's `gameid` set by the server */
  gameid: number;
  /** The raw game config sent by TETR.IO */
  options: GameTypes.ReadyOptions;
  /** The targets set by the server */
  serverTargets: number[] = [];
  /** The gameids of the users targeting the client */
  enemies: number[] = [];
  /** The keys the client has queued to press (allows for pressing keys in the future) */
  keyQueue: NonNullable<GameTypes.Tick.Out["keys"]> = [];
  /** Whether or not targeting is allowed (changed by server). Setting target while this is `false` will throw an error. */
  canTarget = true;
  /** The BotWrapper in use. When a BotWrapper is set, `tick` will not be called. */
  botWrapper?: BotWrapper;
  /** The performance.now() timestamp when the gameplay started */
  startTime: number | null = null;
  /** The last time IGEs were flushed */
  lastIGEFlush: number = performance.now();
  /** The tick function called every game tick */
  tick?: GameTypes.Tick.Func;

  /** The maximum amount of time before all IGEs are force-flushed */
  static maxIGETimeout = 30000;
  /** Frames per message */
  static #fpm = 12;

  constructor(client: Client, players: GameTypes.Ready["players"]) {
    this.#client = client;
    this.#hook = client.hook();
    this.#players = players;

    const self = players.find((p) => p.userid === this.#client.user.id);

    if (!self) throw new Error("Could not find self in game players list");

    this.gameid = self.gameid;
    this.options = self.options;

    try {
      this.engine = Game.createEngine(this.options, this.gameid, this.#players);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * @internal
   * Stops the client's gameplay, when it dies. Does not destroy the game. You don't need to call this manually.
   */
  destroy() {
    this.#hook.destroy();

    if (this.#timeout)
      this.#timeout = (clearTimeout(this.#timeout) as any) || null;

    this.engine.events.removeAllListeners();

    delete this.#client.game?.self;
  }

  /** Initialize the client's game. You don't need to call this manually. */
  init() {
    this.#hook.on("game.match", (_data) => {});
    this.#hook.once("game.start", () => {
      this.#timeout = setTimeout(
        () => {
          this.#start();
        },
        this.options.countdown_count * this.options.countdown_interval +
          this.options.precountdown +
          this.options.prestart
      );
      this.#hook.once("game.abort", () => clearTimeout(this.#timeout!));
    });

    this.#hook.on("game.replay.ige", (data) => this.#handleIGE(data));
  }

  #start() {
    this.#pipe(
      {
        type: "start",
        frame: 0,
        data: {}
      },
      getFullFrame(this.options)
    );

    this.startTime = performance.now();
    try {
      // sends the targeting message
      // eslint-disable-next-line no-self-assign
      this.target = this.target;
    } catch {
      /* empty */
    }

    this.#client.emit("client.game.round.start", [
      (f) => {
        this.tick = f;
      },
      this.engine
    ]);

    this.#timeout = setTimeout(this.#tickGame.bind(this), 0);
  }

  #flushFrames() {
    let returnFrames = this.#frameQueue.filter(
      (f) => f.frame <= this.engine.frame
    );
    this.#frameQueue = this.#frameQueue.filter(
      (f) => f.frame > this.engine.frame
    );
    if (!this.canTarget)
      returnFrames = returnFrames.filter(
        (f) => f.type !== "strategy" && f.type !== "manual_target"
      );
    if (!this.options.manual_allowed)
      returnFrames = returnFrames.filter((f) => f.type !== "manual_target");

    // move the full frame to the front as a precaution
    const fullFrameIndex = returnFrames.findIndex(
      (frame) => frame.type === "full"
    );
    if (fullFrameIndex >= 0) {
      returnFrames = moveElementToFirst(returnFrames, fullFrameIndex);
    }

    // move start frame to front (start -> full at the end)
    const startFrameIndex = returnFrames.findIndex(
      (frame) => frame.type === "start"
    );
    if (startFrameIndex >= 0) {
      returnFrames = moveElementToFirst(returnFrames, startFrameIndex);
    }
    return returnFrames;
  }

  async #tickGame(): Promise<void> {
    if (this.#over) return;
    const runAfter: GameTypes.Tick.Out["runAfter"] = [];
    if (this.tick) {
      try {
        const res = await this.tick({
          gameid: this.gameid,
          frame: this.engine.frame,
          events: this.#messageQueue.splice(0, this.#messageQueue.length),
          engine: this.engine!
        });

        const isValidObject = (obj: any) =>
          typeof obj === "object" && obj !== null;
        if (res.keys)
          this.keyQueue.push(
            ...res.keys.filter((k, idx) => {
              if (
                !isValidObject(k) ||
                !(k.type === "keydown" || k.type === "keyup") ||
                typeof k.frame !== "number" ||
                isNaN(k.frame) ||
                k.frame < this.engine.frame ||
                !isValidObject(k.data) ||
                !(
                  [
                    "moveLeft",
                    "moveRight",
                    "hardDrop",
                    "hold",
                    "softDrop",
                    "rotateCW",
                    "rotate180",
                    "rotateCCW",
                    "undo",
                    "redo",
                    "retry"
                  ] satisfies GameTypes.Tick.Keypress["data"]["key"][]
                ).includes(k.data.key) ||
                typeof k.data.subframe !== "number" ||
                isNaN(k.data.subframe) ||
                k.data.subframe < 0
              ) {
                Game.log(
                  `Invalid key event at index ${idx} passed on frame ${this.engine.frame}:\n${JSON.stringify(k, null, 2)}`,
                  {
                    level: "error"
                  }
                );
                return false;
              }
              return true;
            })
          );
        if (res.runAfter)
          runAfter.push(
            ...res.runAfter.filter((ra, idx) => {
              if (typeof ra !== "function") {
                Game.log(
                  `Invalid runAfter callback at index ${idx} passed on frame ${this.engine.frame}.`,
                  {
                    level: "warning"
                  }
                );
                return false;
              }
              return true;
            })
          );
      } catch (e) {
        if (this.#over) return;
        throw e;
      }
    }
    if (this.#over) return;

    // ideally, iges get flushed here
    this.#flushIGEs();

    const keys: typeof this.keyQueue = [];

    for (let i = this.keyQueue.length - 1; i >= 0; i--) {
      const key = this.keyQueue[i];
      if (Math.floor(key.frame) === this.engine.frame) {
        keys.push(key);
        this.keyQueue.splice(i, 1);
      }
    }

    keys.splice(0, keys.length, ...keys.reverse());

    try {
      const { garbage } = this.engine.tick([
        ...this.#incomingGarbage.splice(0, this.#incomingGarbage.length),
        ...keys
      ]);

      this.#messageQueue.push(
        ...garbage.received.map((g) => ({
          type: "garbage" as const,
          ...g
        }))
      );

      this.#pipe(...keys);

      if (this.engine.frame !== 0 && this.engine.frame % Self.#fpm === 0) {
        const frames = this.#flushFrames();
        this.#client.emit("game.replay", {
          gameid: this.gameid,
          provisioned: this.engine.frame,
          frames
        });

        this.#messageQueue.push({
          type: "frameset",
          provisioned: this.engine.frame,
          frames
        });
      }

      runAfter.forEach((f) => f());

      // flush at the time `keyQueue` is most likely to be empty (so that continuous playing doesn't cause an ige backup). Garbage might be a frame late.
      this.#flushIGEs();

      const target =
        ((this.engine.frame + 1) / Game.fps) * 1000 -
        (performance.now() - this.startTime!);

      if (target <= -2000 && !this.#slowTickWarning) {
        Game.log(
          `Triangle.js is lagging behind by more than 2 seconds! Your \`tick\` function is likely taking too long to execute.`,
          {
            level: "warning"
          }
        );
        this.#slowTickWarning = true;
      }

      // Every half second, use timeout even if we lag to ensure the websocket can send frames
      if (target <= 0 && this.engine.frame % (Game.fps / 2) !== 0) {
        return this.#tickGame();
      }

      this.#timeout = setTimeout(
        this.#tickGame.bind(this),
        Math.max(0, target)
      );
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  #pipe(...frames: GameTypes.Replay.Frame[]) {
    this.#frameQueue.push(...frames);
  }

  #handleIGE(data: Events.in.Game["game.replay.ige"]) {
    this.#igeQueue.push(...data.iges);
    this.#flushIGEs();
  }

  #flushIGEs() {
    if (
      this.igesPaused &&
      this.lastIGEFlush + Self.maxIGETimeout > performance.now()
    )
      return;
    this.#igeQueue
      .splice(0, this.#igeQueue.length)
      .forEach((ige) => this.#__internal_handleIGE(ige));
    this.lastIGEFlush = performance.now();
  }

  #__internal_handleIGE(ige: GameTypes.IGE) {
    const frame: GameTypes.Replay.Frame = {
      frame: this.engine.frame,
      type: "ige",
      data: ige
    };

    this.#pipe(frame);
    this.#incomingGarbage.push({ ...frame });

    if (ige.type === "interaction_confirm") {
      if (ige.data.type === "targeted") {
        // TODO: implement
      }
    } else if (ige.type === "target") {
      this.serverTargets = ige.data.targets;
    } else if (ige.type === "allow_targeting") {
      this.canTarget = ige.data.value;
    }
  }

  /** Pauses accepting IGEs (garbage events) when the `keyQueue` has items, when `pauseIGEs` is set to true. */
  get pauseIGEs() {
    return this.#pauseIGEs;
  }

  set pauseIGEs(value: boolean) {
    this.#pauseIGEs = value;
    this.#flushIGEs();
  }

  /** Force stops the processing of all IGEs (garbage, etc). If left `true` for too long (~30s), IGEs will be automatically flushed to avoid a forced disconnect. Use sparingly. */
  get forcePauseIGEs() {
    return this.#forcePauseIGEs;
  }

  set forcePauseIGEs(value: boolean) {
    this.#forcePauseIGEs = value;
    this.#flushIGEs();
  }

  /** Whether or not the `Game` is currently allowed to process IGEs. */
  get igesPaused() {
    return (
      this.#forcePauseIGEs || (this.#pauseIGEs && this.keyQueue.length > 0)
    );
  }

  /**
   * The current targeting strategy. Setting a targeting strategy throws error if targeting is not allowed.
   */
  get target() {
    return this.#target;
  }

  set target(t: GameTypes.Target) {
    if (!this.canTarget) throw new Error("Targeting not allowed.");
    const strategyMap = {
      even: 0,
      elims: 1,
      random: 2,
      payback: 3,
      manual: 4
    } as const;

    const frame = this.engine.frame;
    if (t.strategy === "manual") {
      this.#pipe({
        frame,
        type: "manual_target",
        data: t.target
      });
    } else {
      this.#pipe({
        frame,
        type: "strategy",
        data: strategyMap[t.strategy]
      });
    }
  }
}
