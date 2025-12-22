import { Mino } from "../types";
import { Bag } from "./core";

export class Bag7PlusX extends Bag {
  static #extraPieceCount = [3, 2, 1, 1];

  next() {
    const extra = Bag7PlusX.#extraPieceCount[this.id++] ?? 0;
    if (this.extra.length < extra)
      this.extra = this.rng.shuffleArray([
        Mino.Z,
        Mino.L,
        Mino.O,
        Mino.S,
        Mino.I,
        Mino.J,
        Mino.T
      ] as const);
    return this.rng.shuffleArray([
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T,
      ...this.extra.splice(0, extra)
    ] as const);
  }
}
