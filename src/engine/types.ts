import type {
  Board,
  ConnectedBoard,
  Engine,
  GarbageQueueSnapshot,
  Mino,
  OutgoingGarbage,
  TetrominoSnapshot
} from ".";
import type { Game } from "../types";
import { type IGEHandlerSnapshot } from "./multiplayer";

export type SpinType = "none" | "mini" | "normal";

export interface IncreasableValue {
  value: number;
  increase: number;
  marginTime: number;
}

export interface EngineSnapshot {
  frame: number;
  subframe: number;
  queue: number;
  hold: Mino | null;
  holdLocked: boolean;
  input: Engine["input"];
  falling: TetrominoSnapshot;
  lastSpin: Engine["lastSpin"];
  lastWasClear: boolean;
  garbage: GarbageQueueSnapshot;
  board: Board["state"];
  connectedBoard: ConnectedBoard["state"];
  targets?: number[];
  stats: Engine["stats"];
  glock: number;
  state: number;
  currentSpike: number;
  ige: IGEHandlerSnapshot;
  resCache: Engine["resCache"];
}

export interface LockRes {
  /** The locked mino */
  mino: Mino;
  /** The number of garbage lines cleared */
  garbageCleared: number;
  /** The number of lines cleared */
  lines: number;
  /** The type of spin performed */
  spin: SpinType;
  /** Garbage from attacks before cancelling */
  rawGarbage: number[];
  /** Garbage from attacks after cancelling */
  garbage: number[];
  /** The amount of garbage released by surge before cancelling */
  surge: number;
  /** The current engine stats */
  stats: {
    garbage: {
      sent: number;
      attack: number;
      receive: number;
      cleared: number;
    };
    combo: number;
    b2b: number;
    pieces: number;
    lines: number;
  };
  /** The amount of garbage added to the board */
  garbageAdded: false | OutgoingGarbage[];
  /** Whether or not the engine is topped out */
  topout: boolean;
  /** The number of frames since the last piece was placed */
  pieceTime: number;
  /** The keys pressed since the last lock */
  keysPresses: Game.Key[];
}

export interface Events {
  /** Fired when garbage is recieved, immediately after it is added to the garbage queue */
  "garbage.receive": {
    /** The garbage's interaction id */
    iid: number;
    /** The amount added to the garbage queue after passthrough canceling */
    amount: number;
    /** The original amount recieved before passthrough cancelling */
    originalAmount: number;
  };
  /** Fired when garbage is confirmed (interaction_confirm ige). This starts the cancel timer (usually 20 frames) */
  "garbage.confirm": {
    /** The garbage's interaction id */
    iid: number;
    /** The sender's game id */
    gameid: number;
    /** The frame to start timer at */
    frame: number;
  };
  /** Fired immediately after garbage is tanked. */
  "garbage.tank": {
    /** The garbage's interaction id */
    iid: number;
    /** The garbage's spawn column (0-indexed) */
    column: number;
    /** The height of the garbage column */
    amount: number;
    /** The width of the garbage column */
    size: number;
  };
  /** Fired immediately after garbage is cancelled. */
  "garbage.cancel": {
    /** The garbage's interaction id */
    iid: number;
    /** The amount of garbage that was cancelled */
    amount: number;
    /** The width of the would-be garbage */
    size: number;
  };

  /** Fired whenever a piece locks. */
  "falling.lock": LockRes;

  /** Fired whenever a new set of pieces is added to the queue. */
  "queue.add": Mino[];
}
