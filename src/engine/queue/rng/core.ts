import { RNG } from "../../utils";
import type { Mino } from "../types";

export interface BagSnapshot {
  rng: number;
  id: number;
  extra: Mino[];
  lastGenerated: number | null;
}

export abstract class Bag {
  rng: RNG;
  id: number = 0;
  extra: Mino[] = [];
  lastGenerated: number | null = null;
  constructor(seed: number) {
    this.rng = new RNG(seed);
  }

  abstract next(): Mino[];

  snapshot(): BagSnapshot {
    return {
      rng: this.rng.seed,
      id: this.id,
      extra: this.extra.slice(),
      lastGenerated: this.lastGenerated
    };
  }

  // note: not static because of inheritance
  fromSnapshot(snapshot: BagSnapshot) {
    this.rng = new RNG(snapshot.rng);
    this.id = snapshot.id;
    this.extra = snapshot.extra.slice();
    this.lastGenerated = snapshot.lastGenerated;
  }
}
