import { Mino } from "../types";
import { Bag } from "./core";

export class Bag7Plus2 extends Bag {
  next() {
    return this.rng.shuffleArray([
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T,
      ([Mino.Z, Mino.L, Mino.O, Mino.S, Mino.I, Mino.J, Mino.T] as const)[
        Math.floor(this.rng.nextFloat() * 7)
      ],
      ([Mino.Z, Mino.L, Mino.O, Mino.S, Mino.I, Mino.J, Mino.T] as const)[
        Math.floor(this.rng.nextFloat() * 7)
      ]
    ]);
  }
}
