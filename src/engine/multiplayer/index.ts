import type { Game } from "../../types";

export * from "./ige";

export interface MultiplayerOptions {
  opponents: number[];
  passthrough: Game.Passthrough;
}
