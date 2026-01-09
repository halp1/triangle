import { Mino } from "../types";
import { Bag } from "./core";

export class Random extends Bag {
  next() {
    const TETROMINOS: Mino[] = [
      Mino.Z,
      Mino.L,
      Mino.O,
      Mino.S,
      Mino.I,
      Mino.J,
      Mino.T
    ];
    return [TETROMINOS[Math.floor(this.rng.nextFloat() * TETROMINOS.length)]];
  }
}
