import { deepCopy } from "..";
import { type BoardSquare } from "../../board";
import { Mino } from "../../queue/types";
import { type KickTable, legal, performKick } from "../kicks";
import { tetrominoes } from "./data";
import type { Rotation } from "./types";

export interface TetrominoInitializeParams {
  symbol: Mino;
  initialRotation: Rotation;
  boardHeight: number;
  boardWidth: number;
  from?: Tetromino | TetrominoSnapshot;
}

export interface TetrominoSnapshot {
  symbol: Mino;
  location: [number, number];
  locking: number;
  lockResets: number;
  rotResets: number;
  safeLock: number;
  highestY: number;
  rotation: Rotation;
  fallingRotations: number;
  totalRotations: number;
  irs: number;
  ihs: boolean;
  aox: number;
  aoy: number;
  keys: number;
}

export class Tetromino {
  #rotation!: Rotation;
  symbol: Mino;
  states: [number, number][][];
  location: [number, number];

  locking: number;
  lockResets: number;
  rotResets: number;
  safeLock: number;
  highestY: number;
  fallingRotations: number;
  totalRotations: number;
  irs: number;
  ihs: boolean;
  aox: number;
  aoy: number;
  keys: number;

  constructor(options: TetrominoInitializeParams) {
    this.rotation = options.initialRotation;
    this.symbol = options.symbol;
    const tetromino = tetrominoes[this.symbol.toLowerCase()];

    this.states = tetromino.matrix.data as any;

    this.location = [
      Math.floor(options.boardWidth / 2 - tetromino.matrix.w / 2),
      options.boardHeight + 2.04
    ];

    // other stuff
    this.locking = 0;
    this.lockResets = 0;
    this.rotResets = 0;
    this.safeLock = options.from?.safeLock ?? 0;
    this.highestY = options.boardHeight + 2;
    this.fallingRotations = 0;
    this.totalRotations = 0;
    this.irs = options.from?.irs ?? 0;
    this.ihs = options.from?.ihs ?? false;
    this.aox = 0;
    this.aoy = 0;
    this.keys = 0;
  }

  get blocks() {
    return this.states[Math.min(this.rotation, this.states.length)];
  }

  get absoluteBlocks() {
    return this.blocks.map((block): [number, number] => [
      block[0] + this.location[0],
      -block[1] + this.y
    ]);
  }

  absoluteAt({
    x = this.location[0],
    y = this.location[1],
    rotation = this.rotation
  }: {
    x?: number;
    y?: number;
    rotation?: number;
  }) {
    const currentState = [this.location[0], this.location[1], this.rotation];

    this.location = [x, y];
    this.rotation = rotation;

    const res = this.absoluteBlocks;

    this.location = [currentState[0], currentState[1]];
    this.rotation = currentState[2];

    return res;
  }

  get rotation(): Rotation {
    return (this.#rotation % 4) as any;
  }

  set rotation(value: number) {
    this.#rotation = (value % 4) as any;
  }

  get x() {
    return this.location[0];
  }

  set x(value: number) {
    this.location[0] = value;
  }

  get y() {
    return Math.floor(this.location[1]);
  }

  set y(value: number) {
    this.location[1] = value;
  }

  isStupidSpinPosition(board: BoardSquare[][]) {
    return !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0],
        -block[1] + this.y - 1
      ]),
      board
    );
  }

  isAllSpinPosition(board: BoardSquare[][]) {
    return (
      !legal(
        this.blocks.map((block) => [
          block[0] + this.location[0] - 1,
          -block[1] + this.y
        ]),
        board
      ) &&
      !legal(
        this.blocks.map((block) => [
          block[0] + this.location[0] + 1,
          -block[1] + this.y
        ]),
        board
      ) &&
      !legal(
        this.blocks.map((block) => [
          block[0] + this.location[0],
          -block[1] + this.y + 1
        ]),
        board
      ) &&
      !legal(
        this.blocks.map((block) => [
          block[0] + this.location[0],
          -block[1] + this.y - 1
        ]),
        board
      )
    );
  }

  rotate(
    board: BoardSquare[][],
    kickTable: KickTable,
    amt: Rotation,
    maxMovement: boolean
  ) {
    const rotatedBlocks = this.states[(this.rotation + amt) % 4];
    const kickRes = performKick(
      kickTable,
      this.symbol,
      this.location,
      [this.aox, this.aoy],
      maxMovement,
      rotatedBlocks,
      this.rotation,
      ((this.rotation + amt) % 4) as any,
      board
    );

    if (typeof kickRes === "object") {
      this.location = [...kickRes.newLocation];
    }
    if (kickRes) {
      this.rotation = this.rotation + amt;

      return kickRes;
    }

    return false;
  }

  moveRight(board: BoardSquare[][]) {
    if (
      legal(
        this.blocks.map((block) => [
          block[0] + this.location[0] + 1,
          -block[1] + this.y
        ]),
        board
      )
    ) {
      this.location[0]++;
      return true;
    }
    return false;
  }
  moveLeft(board: BoardSquare[][]) {
    if (
      legal(
        this.blocks.map((block) => [
          block[0] + this.location[0] - 1,
          -block[1] + this.y
        ]),
        board
      )
    ) {
      this.location[0]--;
      return true;
    }

    return false;
  }

  dasRight(board: BoardSquare[][]) {
    if (this.moveRight(board)) {
      while (this.moveRight(board)) {}
      return true;
    }
    return false;
  }

  dasLeft(board: BoardSquare[][]) {
    if (this.moveLeft(board)) {
      while (this.moveLeft(board)) {}
      return true;
    }
    return false;
  }

  softDrop(board: BoardSquare[][]) {
    const start = this.location[1];
    while (
      legal(
        this.blocks.map((block) => [
          block[0] + this.location[0],
          -block[1] + this.y - 1
        ]),
        board
      )
    ) {
      this.location[1]--;
    }

    return start !== this.location[1];
  }

  snapshot(): TetrominoSnapshot {
    return {
      aox: this.aox,
      aoy: this.aoy,
      fallingRotations: this.fallingRotations,
      highestY: this.highestY,
      ihs: this.ihs,
      irs: this.irs,
      keys: this.keys,
      rotation: this.rotation,
      location: deepCopy(this.location),
      locking: this.locking,
      lockResets: this.lockResets,
      rotResets: this.rotResets,
      safeLock: this.safeLock,
      symbol: this.symbol,
      totalRotations: this.totalRotations
    };
  }
}

export * from "./data";
export * from "./types";
