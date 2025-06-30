import type { BagType, KickTable } from "../engine";
import type { Game } from "./game";
import type { User } from "./user";

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
    extra: {};
  }

  export interface SetConfig {
    name: string;
    options: {
      g: number | string;
      stock: number | string;
      display_next: boolean;
      display_hold: boolean;
      gmargin: number | string;
      gincrease: number | string;
      garbagemultiplier: number | string;
      garbagemargin: number | string;
      garbageincrease: number | string;
      garbagecap: number | string;
      garbagecapincrease: number | string;
      garbagecapmax: number | string;
      garbageattackcap: number | string;
      garbageabsolutecap: boolean;
      garbagephase: number | string;
      garbagequeue: boolean;
      garbageare: number | string;
      garbageentry: string;
      garbageblocking: string;
      garbagetargetbonus: string;
      presets: Game.Preset;
      bagtype: BagType;
      spinbonuses: Game.SpinBonuses;
      combotable: Game.ComboTable;
      kickset: KickTable;
      nextcount: number | string;
      allow_harddrop: boolean;
      display_shadow: boolean;
      locktime: number | string;
      garbagespeed: number | string;
      are: number | string;
      lineclear_are: number | string;
      infinitemovement: boolean;
      lockresets: number | string;
      allow180: boolean;
      room_handling: boolean;
      room_handling_arr: number | string;
      room_handling_das: number | string;
      room_handling_sdf: number | string;
      manual_allowed: boolean;
      b2bchaining: boolean;
      b2bcharging: boolean;
      openerphase: boolean;
      allclear_garbage: number | string;
      allclear_b2b: number | string;
      garbagespecialbonus: number | string;
      roundmode: string;
      allclears: boolean;
      clutch: boolean;
      nolockout: boolean;
      passthrough: Game.Passthrough;
      boardwidth: number | string;
      boardheight: number | string;
      messiness_change: number | string;
      messiness_inner: number | string;
      messiness_nosame: boolean;
      messiness_timeout: number | string;
      usebombs: boolean;
    };
    userLimit: number | string;
    autoStart: number | string;
    allowAnonymous: boolean;
    allowUnranked: boolean;
    userRankLimit: string;
    useBestRankAsLimit: boolean;
    forceRequireXPToChat: boolean;
    gamebgm: string;
    match: {
      gamemode: Game.GameMode;
      modename: string;
      ft: number | string;
      wb: number | string;
    };
  }
}
