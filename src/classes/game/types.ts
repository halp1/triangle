import type { Game } from "../../types";

export interface GameSnapshot {
  frameQueue: Game.Replay.Frame[];
  incomingGarbage: (Game.Replay.Frames.IGE & { frame: number })[];
  messageQueue: Game.Client.Events[];
}
