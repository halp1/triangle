import { Mino } from "../types";
import { Bag } from "./core";

export class Pairs extends Bag {
  next() {
    const s = this.rng.shuffleArray([
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T
    ]);
    const pairs = this.rng.shuffleArray([s[0], s[0], s[0], s[1], s[1], s[1]]);
    return pairs;
  }
}
