import { Mino } from "../queue/types";

export interface BoardInitializeParams {
  width: number;
  height: number;
  buffer: number;
}

export type BoardSquare = Mino | null;

export class Board {
  state: BoardSquare[][];

  private _height: number;
  private _width: number;
  private _buffer: number;

  constructor(options: BoardInitializeParams) {
    this._width = options.width;
    this._height = options.height;
    this._buffer = options.buffer;
    this.state = Array(this.fullHeight)
      .fill(null)
      .map(() => Array(this.width).fill(null));
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
  }

  get buffer(): number {
    return this._buffer;
  }

  set buffer(value: number) {
    this._buffer = value;
  }

  get fullHeight(): number {
    return this.height + this.buffer;
  }

  occupied(x: number, y: number): boolean {
    return (
      x < 0 ||
      y < 0 ||
      x >= this.width ||
      y >= this.fullHeight ||
      this.state[y][x] !== null
    );
  }

  add(...blocks: [BoardSquare, number, number][]) {
    blocks.forEach(([char, x, y]) => {
      if (y < 0 || y >= this.fullHeight || x < 0 || x >= this.width) return;
      this.state[y][x] = char;
    });
  }

  clearLines() {
    let garbageCleared = 0;
    const lines: number[] = [];
    this.state.forEach((row, idx) => {
      if (row.every((block) => block !== null && block !== Mino.BOMB)) {
        lines.push(idx);
        if (row.some((block) => block === Mino.GARBAGE)) garbageCleared++;
      }
    });

    [...lines].reverse().forEach((line) => {
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    });
    return { lines: lines.length, garbageCleared };
  }

  clearBombs(placedBlocks: [number, number][]) {
    let lowestY = placedBlocks.reduce(
      (acc, [_, y]) => Math.min(acc, y),
      this.fullHeight
    );
    if (lowestY === 0) return { lines: 0, garbageCleared: 0 };

    const lowestBlocks = placedBlocks.filter(([_, y]) => y === lowestY);

    const bombColumns = lowestBlocks
      .filter(([x, y]) => this.state[y - 1][x] === Mino.BOMB)
      .map(([x, _]) => x);
    if (bombColumns.length === 0) return { lines: 0, garbageCleared: 0 };

    const lines: number[] = [];

    while (
      lowestY > 0 &&
      bombColumns.some((col) => this.state[lowestY - 1][col] === Mino.BOMB)
    ) {
      lines.push(--lowestY);
    }

    if (lines.length === 0) return { lines: 0, garbageCleared: 0 };

    lines.forEach((line) => {
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    });

    return { lines: lines.length, garbageCleared: lines.length };
  }

  clearBombsAndLines(placedBlocks: [number, number][]) {
    const bombs = this.clearBombs(placedBlocks);
    const lines = this.clearLines();
    return {
      lines: lines.lines + bombs.lines,
      garbageCleared: bombs.garbageCleared + lines.garbageCleared
    };
  }

  get perfectClear() {
    return this.state.every((row) => row.every((block) => block === null));
  }

  insertGarbage({
    amount,
    size,
    column,
    bombs
  }: {
    amount: number;
    size: number;
    column: number;
    bombs: boolean;
  }) {
    this.state.splice(
      0,
      0,
      ...Array.from({ length: amount }, () =>
        Array.from({ length: this.width }, (_, idx) =>
          idx >= column && idx < column + size
            ? bombs
              ? Mino.BOMB
              : null
            : Mino.GARBAGE
        )
      )
    );

    this.state.splice(this.fullHeight - amount - 1, amount);
  }
}

export * from "./connected";
