import { Mino } from "../types";
import { Bag } from "./core";

export class Bag14 extends Bag {
  next() {
    return this.rng.shuffleArray([
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T,
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
