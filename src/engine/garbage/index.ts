import { deepCopy, RNG } from "../utils";

export interface GarbageQueueInitializeParams {
  cap: {
    value: number;
    marginTime: number;
    increase: number;
    absolute: number;
    max: number;
  };
  messiness: {
    change: number;
    within: number;
    nosame: boolean;
    timeout: number;
    center: boolean;
  };

  garbage: {
    speed: number;
    holeSize: number;
  };

  multiplier: {
    value: number;
    increase: number;
    marginTime: number;
  };

  bombs: boolean;

  seed: number;
  boardWidth: number;
  rounding: "down" | "rng";
  openerPhase: number;
  specialBonus: boolean;
}

export interface Garbage {
  frame: number;
  amount: number;
  size: number;
}

export interface IncomingGarbage extends Garbage {
  cid: number;
  gameid: number;
  confirmed: boolean;
}
export interface OutgoingGarbage extends Garbage {
  id: number;
  column: number;
}

export interface GarbageQueueSnapshot {
  seed: number;
  lastTankTime: number;
  lastColumn: number | null;
  sent: number;
  hasChangedColumn: boolean;
  lastReceivedCount: number;
  queue: IncomingGarbage[];
}

export class GarbageQueue {
  options: GarbageQueueInitializeParams;

  queue: IncomingGarbage[];

  lastTankTime: number = 0;
  lastColumn: number | null = null;
  hasChangedColumn: boolean = false;
  lastReceivedCount: number = 0;
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
      hasChangedColumn: this.hasChangedColumn,
      lastReceivedCount: this.lastReceivedCount,
      queue: deepCopy(this.queue)
    };
  }

  fromSnapshot(snapshot: GarbageQueueSnapshot) {
    this.queue = deepCopy(snapshot.queue);
    this.lastTankTime = snapshot.lastTankTime;
    this.lastColumn = snapshot.lastColumn;
    this.rng = new RNG(snapshot.seed);
    this.sent = snapshot.sent;
    this.hasChangedColumn = snapshot.hasChangedColumn;
    this.lastReceivedCount = snapshot.lastReceivedCount;
  }

  rngex() {
    return this.rng.nextFloat();
  }

  get size() {
    return this.queue.reduce((a, b) => a + b.amount, 0);
  }

  resetReceivedCount() {
    this.lastReceivedCount = 0;
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

    const cancelled: IncomingGarbage[] = [];
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
      if (this.queue[0].amount <= 0) {
        this.queue.shift();
        if (this.rngex() < this.options.messiness.change) {
          this.#reroll_column();
          this.hasChangedColumn = true;
        }
      }
      if (send > 0) send--;
      else cancel--;
    }

    this.sent += send;
    return [send, cancelled] as const;
  }

  get #columnWidth() {
    return Math.max(
      0,
      this.options.boardWidth - (this.options.garbage.holeSize - 1)
    );
  }

  #reroll_column() {
    const centerBuffer = this.options.messiness.center
      ? Math.round(this.options.boardWidth / 5)
      : 0;

    let col: number;
    if (this.options.messiness.nosame && this.lastColumn !== null) {
      col =
        centerBuffer +
        Math.floor(this.rngex() * (this.#columnWidth - 1 - 2 * centerBuffer));
      if (col >= this.lastColumn) col++;
    } else {
      col =
        centerBuffer +
        Math.floor(this.rngex() * (this.#columnWidth - 2 * centerBuffer));
    }

    this.lastColumn = col;
    return col;
  }

  tank(frame: number, cap: number, hard: boolean): OutgoingGarbage[] {
    if (this.queue.length === 0) return [];

    const res: OutgoingGarbage[] = [];

    this.queue = this.queue.sort((a, b) => a.frame - b.frame);

    if (
      this.options.messiness.timeout &&
      frame >= this.lastTankTime + this.options.messiness.timeout
    ) {
      this.#reroll_column();
      this.hasChangedColumn = true;
    }

    const tankAll = false;
    const lines = tankAll
      ? 400
      : Math.floor(Math.min(cap, this.options.cap.max));

    for (let i = 0; i < lines && this.queue.length !== 0; i++) {
      const item = this.queue[0];

      // TODO: Fix this
      // The real game uses an "active" system where garbages have a proptery, may be an issue later
      if (item.frame + this.options.garbage.speed > (hard ? frame : frame - 1))
        break;

      item.amount--;
      this.lastReceivedCount++;

      let col: number = this.lastColumn!;
      if (
        (col === null || this.rngex() < this.options.messiness.within) &&
        !this.hasChangedColumn
      ) {
        col = this.#reroll_column();
        this.hasChangedColumn = true;
      }

      res.push({
        ...item,
        amount: 1,
        column: col,
        id: item.cid
      });

      this.hasChangedColumn = false;

      if (item.amount <= 0) {
        this.queue.shift();

        if (this.rngex() < this.options.messiness.change) {
          this.#reroll_column();
          this.hasChangedColumn = true;
        }
      }
    }

    return res;
  }

  round(amount: number): number {
    switch (this.options.rounding) {
      case "down":
        return Math.floor(amount);
      case "rng": {
        const floored = Math.floor(amount);
        if (floored === amount) return floored;
        const decimal = amount - floored;
        return floored + (this.rngex() < decimal ? 1 : 0);
      }
      default:
        throw new Error(`Invalid rounding mode ${this.options.rounding}`);
    }
  }

  reset() {
    this.queue = [];
  }
}

export * from "./legacy";
