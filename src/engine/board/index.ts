import { Mino } from "../queue";

export interface BoardInitializeParams {
  width: number;
  height: number;
  buffer: number;
}

export type Tile = {
  mino: Mino;
  connections: number;
} | null;

export enum BoardConnections {
  TOP = 0b1000,
  RIGHT = 0b0100,
  BOTTOM = 0b0010,
  LEFT = 0b0001,
  CORNER = 0b1_0000
}

export class Board {
  state: Tile[][];

  #height: number;
  #width: number;
  #buffer: number;

  constructor(options: BoardInitializeParams) {
    this.#width = options.width;
    this.#height = options.height;
    this.#buffer = options.buffer;
    this.state = Array(this.fullHeight)
      .fill(null)
      .map(() => Array(this.width).fill(null));
  }

  get height(): number {
    return this.#height;
  }

  set height(value: number) {
    this.#height = value;
  }

  get width(): number {
    return this.#width;
  }

  set width(value: number) {
    this.#width = value;
  }

  get buffer(): number {
    return this.#buffer;
  }

  set buffer(value: number) {
    this.#buffer = value;
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

  add(...blocks: [Tile, number, number][]) {
    blocks.forEach(([item, x, y]) => {
      if (y < 0 || y >= this.fullHeight || x < 0 || x >= this.width) return;
      this.state[y][x] = item;
    });
  }

  clearLines() {
    let garbageCleared = 0;
    const lines: number[] = [];
    this.state.forEach((row, idx) => {
      if (row.every((block) => block !== null && block.mino !== Mino.BOMB)) {
        lines.push(idx);
        if (idx > 0) {
          this.state[idx - 1].forEach((block) => {
            if (block) {
              block.connections |= 0b1000;
              if (block.connections & 0b0010) block.connections &= 0b0_1111;
            }
          });
        }
        if (idx < this.fullHeight - 1) {
          this.state[idx + 1].forEach((block) => {
            if (block) {
              block.connections |= 0b0010;
              if (block.connections & 0b1000) block.connections &= 0b0_1111;
            }
          });
        }
        if (row.some((block) => block?.mino === Mino.GARBAGE)) garbageCleared++;
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
      .filter(([x, y]) => this.state[y - 1][x]?.mino === Mino.BOMB)
      .map(([x, _]) => x);
    if (bombColumns.length === 0) return { lines: 0, garbageCleared: 0 };

    const lines: number[] = [];

    while (
      lowestY > 0 &&
      bombColumns.some(
        (col) => this.state[lowestY - 1][col]?.mino === Mino.BOMB
      )
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
    bombs,
    isBeginning,
    isEnd
  }: {
    amount: number;
    size: number;
    column: number;
    bombs: boolean;
    isBeginning: boolean;
    isEnd: boolean;
  }) {
    this.state.splice(
      0,
      0,
      ...Array.from({ length: amount }, (_, y) =>
        Array.from({ length: this.width }, (_, x) =>
          x >= column && x < column + size
            ? bombs
              ? { mino: Mino.BOMB, connections: 0 }
              : null
            : {
                mino: Mino.GARBAGE,
                connections: (() => {
                  let connection = 0;

                  if (isEnd && y === 0) connection |= 0b0010;
                  if (isBeginning && y === amount - 1) connection |= 0b1000;
                  if (x === 0) connection |= 0b0001;
                  if (x === this.width - 1) connection |= 0b0100;
                  if (x === column - 1) connection |= 0b0100;
                  if (x === column + size) connection |= 0b0001;

                  return connection;
                })()
              }
        )
      )
    );

    this.state.splice(this.fullHeight - amount - 1, amount);
  }
}

export * from ".";
