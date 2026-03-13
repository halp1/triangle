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
  CORNER = 0b1_0000,
  ALL = TOP | RIGHT | BOTTOM | LEFT
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
    const fullHeight = this.fullHeight;
    const width = this.width;
    this.state = new Array(fullHeight);
    for (let y = 0; y < fullHeight; y++) {
      this.state[y] = new Array(width).fill(null);
    }
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
    for (let i = 0; i < blocks.length; i++) {
      const [item, x, y] = blocks[i];
      if (y < 0 || y >= this.fullHeight || x < 0 || x >= this.width) continue;
      this.state[y][x] = item;
    }
  }

  clearLines() {
    let garbageCleared = 0;
    const lines: number[] = [];
    const fullHeight = this.fullHeight;
    const width = this.width;

    for (let idx = 0; idx < fullHeight; idx++) {
      const row = this.state[idx];

      let isFullLine = true;
      let hasGarbage = false;
      for (let x = 0; x < width; x++) {
        const block = row[x];
        if (block === null || block.mino === Mino.BOMB) {
          isFullLine = false;
          break;
        }
        if (block.mino === Mino.GARBAGE) hasGarbage = true;
      }

      if (isFullLine) {
        lines.push(idx);
        if (idx > 0) {
          const rowAbove = this.state[idx - 1];
          for (let x = 0; x < width; x++) {
            const block = rowAbove[x];
            if (block) {
              block.connections |= 0b1000;
              if (block.connections & 0b0010) block.connections &= 0b0_1111;
            }
          }
        }
        if (idx < fullHeight - 1) {
          const rowBelow = this.state[idx + 1];
          for (let x = 0; x < width; x++) {
            const block = rowBelow[x];
            if (block) {
              block.connections |= 0b0010;
              if (block.connections & 0b1000) block.connections &= 0b0_1111;
            }
          }
        }
        if (hasGarbage) garbageCleared++;
      }
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    }
    return { lines: lines.length, garbageCleared };
  }

  clearBombs(placedBlocks: [number, number][]) {
    let lowestY = this.fullHeight;
    for (let i = 0; i < placedBlocks.length; i++) {
      const y = placedBlocks[i][1];
      if (y < lowestY) lowestY = y;
    }
    if (lowestY === 0) return { lines: 0, garbageCleared: 0 };

    const bombColumns: number[] = [];
    for (let i = 0; i < placedBlocks.length; i++) {
      const [x, y] = placedBlocks[i];
      if (y === lowestY && this.state[y - 1][x]?.mino === Mino.BOMB) {
        bombColumns.push(x);
      }
    }
    if (bombColumns.length === 0) return { lines: 0, garbageCleared: 0 };

    const lines: number[] = [];

    while (lowestY > 0) {
      let hasBomb = false;
      for (let i = 0; i < bombColumns.length; i++) {
        const col = bombColumns[i];
        if (this.state[lowestY - 1][col]?.mino === Mino.BOMB) {
          hasBomb = true;
          break;
        }
      }

      if (!hasBomb) break;
      lines.push(--lowestY);
    }

    if (lines.length === 0) return { lines: 0, garbageCleared: 0 };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    }

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
    const width = this.width;
    const rows = new Array(amount);
    for (let y = 0; y < amount; y++) {
      const row = new Array(width);
      for (let x = 0; x < width; x++) {
        if (x >= column && x < column + size) {
          row[x] = bombs ? { mino: Mino.BOMB, connections: 0 } : null;
        } else {
          let connection = 0;
          if (isEnd && y === 0) connection |= 0b0010;
          if (isBeginning && y === amount - 1) connection |= 0b1000;
          if (x === 0) connection |= 0b0001;
          if (x === width - 1) connection |= 0b0100;
          if (x === column - 1) connection |= 0b0100;
          if (x === column + size) connection |= 0b0001;
          row[x] = { mino: Mino.GARBAGE, connections: connection };
        }
      }
      rows[y] = row;
    }

    this.state.splice(0, 0, ...rows);

    this.state.splice(this.fullHeight - amount - 1, amount);
  }

  reset() {
    const fullHeight = this.fullHeight;
    const width = this.width;
    this.state = new Array(fullHeight);
    for (let y = 0; y < fullHeight; y++) {
      this.state[y] = new Array(width).fill(null);
    }
  }
}

export * from ".";
