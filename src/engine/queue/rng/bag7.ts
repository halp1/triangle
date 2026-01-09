import { Mino } from "../types";
import { Bag } from "./core";

export class Bag7 extends Bag {
  next() {
    return this.rng.shuffleArray([
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T
    ]);
  }
}
