import type { Engine, Mino } from "../../../engine";
import type * as Messages from "../types/messages";

export abstract class Adapter<
  T extends Messages.CustomMessageData = Messages.CustomMessageData
> {
  abstract initialize(): Promise<Messages.Incoming.Info<T>>;

  protected configFromEngine(
    engine: Engine
  ): Omit<Messages.Outgoing.Config<T>, "type" | "data"> {
    return {
      boardWidth: engine.board.width,
      boardHeight: engine.board.height,
      kicks: engine.kickTableName,
      spins: engine.gameOptions.spinBonuses,
      comboTable: engine.gameOptions.comboTable,
      b2bCharing: !!engine.b2b.charging,
      b2bChargeAt: engine.b2b.charging ? engine.b2b.charging.at : 0,
      b2bChargeBase: engine.b2b.charging ? engine.b2b.charging.base : 0,
      b2bChaining: engine.b2b.chaining,
      garbageMultiplier: engine.dynamic.garbageMultiplier.get(),
      garbageCap: engine.dynamic.garbageMultiplier.get(),
      garbageSpecialBonus: engine.garbageQueue.options.specialBonus,
      pcB2b: engine.pc ? engine.pc.b2b : 0,
      pcGarbage: engine.pc ? engine.pc.garbage : 0,
      queue: engine.queue.value
    };
  }

  protected stateFromEngine(
    engine: Engine
  ): Omit<Messages.Outgoing.State<T>, "type" | "data"> {
    return {
      board: engine.board.state,

      current: engine.falling.symbol,
      hold: engine.held,
      queue: engine.queue.value,

      garbage: engine.garbageQueue.queue.map((item) => item.amount),

      combo: engine.stats.combo,
      b2b: engine.stats.b2b
    };
  }

  protected playFromEngine(
    engine: Engine
  ): Omit<Messages.Outgoing.Play<T>, "type" | "data"> {
    return {
      garbageCap: Math.floor(engine.dynamic.garbageCap.get()),
      garbageMultiplier: engine.dynamic.garbageMultiplier.get()
    };
  }

  abstract config(engine: Engine, data?: T["config"]): void;

  abstract update(engine: Engine, data?: T["state"]): void;

  abstract addPieces(pieces: Mino[], data?: T["pieces"]): void;

  abstract play(
    engine: Engine,
    data?: T["play"]
  ): Promise<Messages.Incoming.Move<T>>;

  abstract stop(): void;
}
