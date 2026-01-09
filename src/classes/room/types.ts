import type { Room } from "../../types";

export interface RoomSnapshot {
  id: string;
  public: boolean;
  type: Room.Type;
}

export interface SpectateData {
  match: {
    /** First to */
    ft: number;
    /** Win by */
    wb: number;
    /** Golden point */
    gp: number;
  };
  players: {
    userID: string;
    username: string;
    wins: number;
    active: boolean;
    naturalorder: number;
  }[];
}
