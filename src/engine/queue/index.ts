import { type BagType, rngMap } from "./rng";
import type { Bag, BagSnapshot } from "./rng";
import { Mino } from "./types";

export interface QueueInitializeParams {
  seed: number;
  type: BagType;
  minLength: number;
}

export interface QueueSnapshot {
  value: Mino[];
  bag: BagSnapshot;
}

export class Queue extends Array<Mino> {
  seed: number;
  type: BagType;
  bag!: Bag;
  _minLength!: number;
  repopulateListener: ((pieces: Mino[]) => void) | null = null;
  constructor(options: QueueInitializeParams) {
    super();
    this.seed = options.seed;
    this.type = options.type;
    this.reset();
    this.minLength = options.minLength;
  }

  reset(index = 0) {
    this.bag = new rngMap[this.type](this.seed);
    this.splice(0, this.length);
    this.repopulate();
    for (let i = 0; i < index; i++) {
      this.shift();
      this.repopulate();
    }
  }

  onRepopulate(listener: NonNullable<typeof this.repopulateListener>) {
    this.repopulateListener = listener;
  }

  get minLength() {
    return this._minLength;
  }
  set minLength(val: number) {
    this._minLength = val;
    this.repopulate();
  }

  get next() {
    return this[0];
  }

  override shift() {
    const val = super.shift();
    this.repopulate();
    return val;
  }

  private repopulate() {
    const added: Mino[] = [];
    while (this.length < this.minLength) {
      const newValues = this.bag.next();
      this.push(...newValues);
      added.push(...newValues);
    }

    if (this.repopulateListener && added.length) {
      this.repopulateListener(added);
    }
  }

  snapshot(): QueueSnapshot {
    return {
      value: Array.from(this),
      bag: this.bag.snapshot()
    };
  }

  fromSnapshot(snapshot: QueueSnapshot) {
    this.bag.fromSnapshot(snapshot.bag);
    this.splice(0, this.length, ...snapshot.value);
  }
}
export * from "./rng";
export * from "./types";
