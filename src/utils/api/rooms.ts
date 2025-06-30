import { type APIDefaults } from ".";
import type { Get, Post } from "./basic";

export namespace Rooms {
  export interface Room {
    id: string;
    name: string;
    name_safe: string;
    type: string;
    userLimit: number;
    userRankLimit: string;
    state: string;
    allowAnonymous: boolean;
    allowUnranked: boolean;
    players: number;
    count: number;
  }
}

export const rooms = (get: Get, _: Post, __: APIDefaults) => {
  return async () => {
    const res = await get<{ rooms: Rooms.Room[] }>({ uri: "rooms/" });

    if (res === null) return [];
    else {
      if (res.success) return res.rooms;
      else return [];
    }
  };
};
