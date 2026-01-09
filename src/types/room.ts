import type { BagType, KickTable } from "../engine";
import type { Game } from "./game";
import type { User } from "./user";
import type { Utils } from "./utils";

export namespace Room {
  export type Type = "custom";

  export type State = "ingame" | "lobby";

  export type Bracket = "player" | "spectator" | "observer";

  export interface Player {
    _id: string;
    username: string;
    anon: boolean;
    bot: boolean;
    role: string;
    xp: number;
    badges: User.Badge[];
    record: {
      games: number;
      wins: number;
      streak: number;
    };
    bracket: Bracket;
    supporter: boolean;
    verified: boolean;
    country: string | null;
  }

  export interface Autostart {
    enabled: boolean;
    status: string;
    time: number;
    maxtime: number;
  }

  export interface Match {
    gamemode: string;
    modename: string;
    ft: number;
    wb: number;
    record_replays: boolean;
    winningKey: string;
    keys: {
      primary: string;
      primaryLabel: string;
      primaryLabelSingle: string;
      primaryIsAvg: boolean;
      secondary: string;
      secondaryLabel: string;
      secondaryLabelSingle: string;
      secondaryIsAvg: boolean;
      tertiary: string;
      tertiaryLabel: string;
      tertiaryLabelSingle: string;
      tertiaryIsAvg: boolean;
    };
    extra: object;
  }

  export interface SetConfig {
    name: string;
    options: {
      g: number;
      stock: number;
      display_next: boolean;
      display_hold: boolean;
      gmargin: number;
      gincrease: number;
      garbagemultiplier: number;
      garbagemargin: number;
      garbageincrease: number;
      garbagecap: number;
      garbagecapincrease: number;
      garbagecapmax: number;
      garbageattackcap: number;
      garbageabsolutecap: number;
      garbagephase: number;
      garbagequeue: boolean;
      garbageare: number;
      garbageentry: string;
      garbageblocking: string;
      garbagetargetbonus: string;
      presets: Game.Preset;
      bagtype: BagType;
      spinbonuses: Game.SpinBonuses;
      combotable: Game.ComboTable;
      kickset: KickTable;
      nextcount: number;
      allow_harddrop: boolean;
      display_shadow: boolean;
      locktime: number;
      garbagespeed: number;
      are: number;
      lineclear_are: number;
      infinitemovement: boolean;
      lockresets: number;
      allow180: boolean;
      room_handling: boolean;
      room_handling_arr: number;
      room_handling_das: number;
      room_handling_sdf: number;
      manual_allowed: boolean;
      b2bchaining: boolean;
      b2bcharging: boolean;
      openerphase: number;
      allclear_garbage: number;
      allclear_b2b: number;
      garbagespecialbonus: boolean;
      roundmode: string;
      allclears: boolean;
      clutch: boolean;
      nolockout: boolean;
      passthrough: Game.Passthrough;
      boardwidth: number;
      boardheight: number;
      messiness_change: number;
      messiness_inner: number;
      messiness_nosame: boolean;
      messiness_timeout: number;
      usebombs: boolean;
    };
    userLimit: number;
    autoStart: number;
    allowAnonymous: boolean;
    allowUnranked: boolean;
    userRankLimit: string;
    useBestRankAsLimit: boolean;
    forceRequireXPToChat: boolean;
    gamebgm: string;
    match: {
      gamemode: Game.GameMode;
      modename: string;
      ft: number;
      wb: number;
    };
  }

  export type SetConfigItem = {
    [K in Utils.DeepKeys<SetConfig>]: {
      index: K;
      value: Utils.DeepKeyValue<SetConfig, K>;
    };
  }[Utils.DeepKeys<SetConfig>];
}
