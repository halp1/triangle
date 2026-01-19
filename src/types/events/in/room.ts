import type { Game as GameTypes, Room as RoomTypes, User } from "../..";

export interface Room {
  "room.join": {
    id: string;
    banner: null; // TODO: what is this
    silent: boolean;
  };

  "room.leave": string;

  "room.kick": "hostkick" | "hostban";

  "room.update": {
    id: string;
    public: boolean;
    name: string;
    name_safe?: string;
    type: RoomTypes.Type;
    owner: string;
    creator: string;
    allowChat?: boolean;
    userLimit: number;
    autoStart: number;
    state: RoomTypes.State;
    topic: Record<string, unknown>;
    info: Record<string, unknown>;
    auto: RoomTypes.Autostart;
    allowAnonymous: boolean;
    allowUnranked: boolean;
    allowQueued: boolean;
    allowBots: boolean;
    userRankLimit: GameTypes.Rank;
    useBestRankAsLimit: boolean;
    options: Partial<GameTypes.Options>;
    match: RoomTypes.Match;
    players: RoomTypes.Player[];
    lobbybg: string | null;
    lobbybgm: string;
    gamebgm: string;
    forceRequireXPToChat: boolean;
    bgmList: unknown[];
    constants: unknown;
  };

  /** Fires when the room's autostart state changes */
  "room.update.auto": {
    enabled: boolean;
    status: "active" | "needsplayers" | "ingame";
    time: number;
    maxtime: number;
  };

  "room.player.add": RoomTypes.Player;
  "room.player.remove": string;
  "room.update.host": string;
  /** Fires when a player's bracket is moved */
  "room.update.bracket": {
    uid: string;
    bracket: RoomTypes.Bracket;
  };

  "room.chat": {
    content: string;
    content_safe?: string;
    suppressable?: boolean;
    user: {
      username: string;
      _id: string | null;
      role?: User.Role;
      supporter?: boolean;
      supporter_tier?: number;
    };
    pinned?: boolean;
    system: boolean;
  };

  /** Fires when a single user's chat messages are deleted */
  "room.chat.delete": {
    uid: string;
    /** Whether or not to completely delete the messages or just mark them as deleted */
    purge: string;
  };
  "room.chat.clear": void;
  /** Fires when someone is gifted supporter in the room */
  "room.chat.gift": {
    /** UID of who gave supporter */
    sender: number;
    /** UID of who received supporter */
    target: number;
    months: number;
  };

  // TODO: find out what is this?
  "party.members": any[];
}
