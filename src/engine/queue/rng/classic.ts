import { Mino } from "../types";
import { Bag } from "./core";

export class Classic extends Bag {
  static #TETROMINOS: Mino[] = [
    Mino.Z,
    Mino.L,
    Mino.O,
    Mino.S,
    Mino.I,
    Mino.J,
    Mino.T
  ];

  next() {
    let index = Math.floor(
      this.rng.nextFloat() * (Classic.#TETROMINOS.length + 1)
    );

    if (index === this.lastGenerated || index >= Classic.#TETROMINOS.length) {
      index = Math.floor(this.rng.nextFloat() * Classic.#TETROMINOS.length);
    }

    this.lastGenerated = index;
    return [Classic.#TETROMINOS[index]];
  }
}
