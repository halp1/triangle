import {
  type GarbageQueueInitializeParams,
  type IncomingGarbage,
  type GarbageQueueSnapshot,
  type OutgoingGarbage
} from ".";
import { deepCopy, RNG } from "../utils";

const columnWidth = (width: number, garbageHoleSize: number) => {
  return Math.max(0, width - (garbageHoleSize - 1));
};

export class LegacyGarbageQueue {
  options: GarbageQueueInitializeParams;

  queue: IncomingGarbage[];

  lastTankTime: number = 0;
  lastColumn: number | null = null;
  rng: RNG;

  // for opener phase calculations
  sent = 0;

  constructor(options: GarbageQueueInitializeParams) {
    this.options = deepCopy(options);
    if (!this.options.cap.absolute)
      this.options.cap.absolute = Number.MAX_SAFE_INTEGER;

    this.queue = [];

    this.rng = new RNG(this.options.seed);
  }

  snapshot(): GarbageQueueSnapshot {
    return {
      seed: this.rng.seed,
      lastTankTime: this.lastTankTime,
      lastColumn: this.lastColumn,
      sent: this.sent,
      queue: deepCopy(this.queue),
      hasChangedColumn: false,
      lastReceivedCount: 0
    };
  }

  fromSnapshot(snapshot: GarbageQueueSnapshot) {
    this.queue = deepCopy(snapshot.queue);
    this.lastTankTime = snapshot.lastTankTime;
    this.lastColumn = snapshot.lastColumn;
    this.rng = new RNG(snapshot.seed);
    this.sent = snapshot.sent;
  }

  rngex() {
    return this.rng.nextFloat();
  }

  get size() {
    return this.queue.reduce((a, b) => a + b.amount, 0);
  }

  receive(...args: IncomingGarbage[]) {
    this.queue.push(...args.filter((arg) => arg.amount > 0));

    while (this.size > this.options.cap.absolute) {
      const total = this.size;
      if (this.queue.at(-1)!.amount <= total - this.options.cap.absolute) {
        this.queue.pop();
      } else {
        this.queue.at(-1)!.amount -= total - this.options.cap.absolute;
      }
    }
  }

  confirm(cid: number, gameid: number, frame: number) {
    const obj = this.queue.find((g) => g.cid === cid && g.gameid === gameid);
    if (!obj) return false;
    obj.frame = frame;
    obj.confirmed = true;
    return true;
  }

  cancel(
    amount: number,
    pieceCount: number,
    legacy: { openerPhase?: boolean } = {}
  ) {
    let send = amount,
      cancel = 0;

    let cancelled: IncomingGarbage[] = [];

    if (
      pieceCount + 1 <=
        this.options.openerPhase - (legacy.openerPhase ? 1 : 0) &&
      this.size >= this.sent
    )
      cancel += amount;
    while ((send > 0 || cancel > 0) && this.size > 0) {
      this.queue[0].amount--;

      if (
        cancelled.length === 0 ||
        cancelled[cancelled.length - 1].cid !== this.queue[0].cid
      ) {
        cancelled.push({ ...this.queue[0], amount: 1 });
      } else {
        cancelled[cancelled.length - 1].amount++;
      }

      if (this.queue[0].amount <= 0) this.queue.shift();
      if (send > 0) send--;
      else cancel--;
    }

    this.sent += send;
    return [send, cancelled] as const;
  }

  /**
   * This function does NOT take into account messiness on timeout.
   * The first garbage hole will be correct,
   * but subsequent holes depend on whether or not garbage is cancelled.
   */
  predict() {
    const rng = this.rng.clone();
    const rngex = rng.nextFloat.bind(rng);

    let lastColumn = this.lastColumn;

    const reroll = () => {
      lastColumn = this.#__internal_rerollColumn(lastColumn, rngex);
      return lastColumn;
    };

    const result = this.#__internal_tank(
      deepCopy(this.queue),
      () => lastColumn,
      rngex,
      reroll,
      -Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      false
    );

    return result.res;
  }

  get nextColumn() {
    const rng = this.rng.clone();
    if (this.lastColumn === null)
      return this.#__internal_rerollColumn(null, rng.nextFloat.bind(rng));
    return this.lastColumn;
  }

  #__internal_rerollColumn(current: number | null, rngex: RNG["nextFloat"]) {
    let col: number;
    const cols = columnWidth(
      this.options.boardWidth,
      this.options.garbage.holeSize
    );

    if (this.options.messiness.nosame && current !== null) {
      col = Math.floor(rngex() * (cols - 1));
      if (col >= current) col++;
    } else {
      col = Math.floor(rngex() * cols);
    }

    return col;
  }

  #rerollColumn() {
    const col = this.#__internal_rerollColumn(
      this.lastColumn,
      this.rngex.bind(this)
    );
    this.lastColumn = col;
    return col;
  }

  #__internal_tank(
    queue: IncomingGarbage[],
    lastColumn: () => number | null,
    rngex: () => number,
    reroll: () => number,
    frame: number,
    cap: number,
    hard: boolean
  ) {
    if (queue.length === 0) return { res: [], lastColumn, queue };

    const res: OutgoingGarbage[] = [];

    queue = queue.sort((a, b) => a.frame - b.frame);

    if (
      this.options.messiness.timeout &&
      frame >= this.lastTankTime + this.options.messiness.timeout
    ) {
      reroll();
      this.lastTankTime = frame;
    }

    let total = 0;

    while (total < cap && queue.length > 0) {
      const item = deepCopy(queue[0]);

      // TODO: wtf hacky fix, this is 100% not right idk how to fix this
      if (item.frame + this.options.garbage.speed > (hard ? frame : frame - 1))
        break; // do not spawn garbage that is still traveling
      total += item.amount;

      let exausted = false;

      if (total > cap) {
        const excess = total - cap;
        queue[0].amount = excess;
        item.amount -= excess;
      } else {
        queue.shift();
        exausted = true;
      }

      for (let i = 0; i < item.amount; i++) {
        const r =
          lastColumn() === null || rngex() < this.options.messiness.within;
        res.push({
          ...item,
          id: item.cid,
          amount: 1,
          column: r ? reroll() : lastColumn()!
        });
      }

      if (exausted && rngex() < this.options.messiness.change) {
        reroll();
      }
    }

    return {
      res,
      queue
    };
  }

  tank(frame: number, cap: number, hard: boolean) {
    const { res, queue } = this.#__internal_tank(
      this.queue,
      () => this.lastColumn,
      this.rngex.bind(this),
      this.#rerollColumn.bind(this),
      frame,
      cap,
      hard
    );

    this.queue = queue;

    return res.map((v) => ({ ...v, bombs: this.options.bombs }));
  }

  round(amount: number): number {
    switch (this.options.rounding) {
      case "down":
        return Math.floor(amount);
      case "rng":
        const floored = Math.floor(amount);
        if (floored === amount) return floored;
        const decimal = amount - floored;
        return floored + (this.rngex() < decimal ? 1 : 0);
      default:
        throw new Error(`Invalid rounding mode ${this.options.rounding}`);
    }
  }
}
