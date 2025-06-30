import type { Room as RoomTypes } from "../../room";
import type { Utils } from "../../utils";

export interface Room {
  "room.join": string;
  "room.create": boolean;
  "room.leave": void;

  "room.kick": { uid: string; duration: number };
  "room.ban": string;
  "room.unban": string;

  "room.setid": string;
  "room.setconfig": {
    index: Utils.DeepKeys<RoomTypes.SetConfig>;
    value: Utils.DeepKeyValue<
      RoomTypes.SetConfig,
      Room["room.setconfig"][number]["index"]
    >;
  }[];

  "room.start": void;
  "room.abort": void;

  "room.chat.send": {
    content: string;
    pinned: boolean;
  };
  "room.chat.clear": void;

  "room.owner.transfer": string;
  "room.owner.revoke": void;

  "room.bracket.switch": "player" | "spectator";
  "room.bracket.move": { uid: string; bracket: "player" | "spectator" };
}
