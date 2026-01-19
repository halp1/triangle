import type { Game } from "../../types";

export interface GameSnapshot {
  frameQueue: Game.Replay.Frame[];
  incomingGarbage: (Game.Replay.Frames.IGEFrame & { frame: number })[];
  messageQueue: Game.Client.Events[];
}
