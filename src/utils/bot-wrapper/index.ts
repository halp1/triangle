import type { Engine } from "../../engine";
import type { Game } from "../../types";
import { adapters } from "../adapters";

export interface BotWrapperConfig {
  pps: number;
}

export class BotWrapper<
  T extends adapters.Types.CustomMessageData = adapters.Types.CustomMessageData
> {
  config: BotWrapperConfig;
  adapter: adapters.Adapter<T>;

  nextFrame!: number;
  needsNewMove = false;

  static nextFrame(engine: Engine, target: number) {
    return ((engine.stats.pieces + 1) / target) * 60;
  }

  static frames(
    engine: Engine,
    keys: adapters.Types.AdapterKey[]
  ): Game.Tick.Keypress[] {
    const round = (r: number) => Math.round(r * 10) / 10;

    let running = engine.frame + engine.subframe;

    return keys.flatMap((key): [Game.Tick.Keypress, Game.Tick.Keypress] => {
      const firstFrame = {
        type: "keydown" as const,
        frame: Math.floor(running),
        data: {
          key:
            key === "dasLeft"
              ? "moveLeft"
              : key === "dasRight"
                ? "moveRight"
                : key,
          subframe: round(running - Math.floor(running))
        }
      };

      if (key === "dasLeft" || key === "dasRight") {
        running = round(running + engine.handling.das);
      } else if (key === "softDrop") {
        running = round(running + 0.1);
      }

      const secondFrame = {
        type: "keyup" as const,
        frame: Math.floor(running),
        data: {
          key:
            key === "dasLeft"
              ? "moveLeft"
              : key === "dasRight"
                ? "moveRight"
                : key,
          subframe: round(running - Math.floor(running))
        }
      };

      return [firstFrame, secondFrame];
    });
  }

  constructor(adapter: adapters.Adapter<T>, config: BotWrapperConfig) {
    this.config = config;
    this.adapter = adapter;

    this.init = this.init.bind(this);
    this.tick = this.tick.bind(this);
    this.stop = this.stop.bind(this);
  }

  async init(engine: Engine, config?: T["config"]) {
    if (engine.handling.arr !== 0)
      throw new Error("BotWrapper requires 0 ARR handling.");
    if (engine.handling.sdf !== 41)
      throw new Error("BotWrapper requires 41 SDF handling.");

    await this.adapter.initialize();
    this.adapter.config(engine, config);

    engine.events.on("queue.add", (pieces) => this.adapter.addPieces(pieces));

    this.nextFrame = BotWrapper.nextFrame(engine, this.config.pps);
  }

  async tick(
    engine: Engine,
    events: Game.Client.Event[],
    data?: Partial<Pick<T, "state" | "play">>
  ) {
    const fullData = {
      state: undefined,
      play: undefined,
      ...data
    };
    if (events.find((event) => event.type === "garbage")) {
      this.adapter.update(engine, fullData.state);
    }
    if (engine.frame >= this.nextFrame) {
      if (this.needsNewMove) {
        this.nextFrame = BotWrapper.nextFrame(engine, this.config.pps);
        this.needsNewMove = false;
      } else {
        const { keys } = await this.adapter.play(engine, fullData.play);

        const frames = BotWrapper.frames(engine, keys);

        this.needsNewMove = true;

        return frames;
      }
    }

    return [];
  }

  stop() {
    this.adapter.stop();
  }
}
