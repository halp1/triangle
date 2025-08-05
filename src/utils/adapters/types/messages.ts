import type { AdapterKey } from ".";
import type { BoardSquare, Engine, Mino } from "../../../engine";
import type { KickTableName } from "../../../engine/utils/kicks/data";
import type { Game } from "../../../types";

export interface CustomMessageData {
  info: void;
  move: void;

  config: void;
  state: void;
  pieces: void;
  play: void;
}

export namespace Incoming {
  export interface Info<Data extends CustomMessageData> {
    type: "info";
    name: string;
    version: string;
    author: string;
    data: Data["info"];
  }

  export interface Move<Data extends CustomMessageData> {
    type: "move";
    keys: AdapterKey[];
    data: Data["move"];
  }

  export type all<Data extends CustomMessageData> = Info<Data> | Move<Data>;

  export type EventMap<Data extends CustomMessageData> = {
    [key in all<Data>["type"]]: Extract<all<Data>, { type: key }>;
  };
}

export namespace Outgoing {
  export interface Config<Data extends CustomMessageData> {
    type: "config";

    boardWidth: number;
    boardHeight: number;

    kicks: KickTableName;
    spins: Game.SpinBonuses;
    comboTable: Game.ComboTable;

    b2bCharing: boolean;
    b2bChargeAt: number;
    b2bChargeBase: number;
    b2bChaining: boolean;

    garbageMultiplier: number;
    garbageCap: number;
    garbageSpecialBonus: boolean;

    pcB2b: number;
    pcGarbage: number;

    queue: Engine["queue"]["value"];

    data: Data["config"];
  }

  export interface State<Data extends CustomMessageData> {
    type: "state";

    board: BoardSquare[][];

    current: Mino;
    hold: Mino | null;
    queue: Mino[];

    garbage: number[];

    combo: number;
    b2b: number;

    data: Data["state"];
  }

  export interface Pieces<Data extends CustomMessageData> {
    type: "pieces";
    pieces: Mino[];
    data: Data["pieces"];
  }

  export interface Play<Data extends CustomMessageData> {
    type: "play";

    garbageMultiplier: number;
    garbageCap: number;

    data: Data["play"];
  }

  export type all<Data extends CustomMessageData> =
    | Config<Data>
    | State<Data>
    | Pieces<Data>
    | Play<Data>;

  export type EventMap<Data extends CustomMessageData> = {
    [key in all<Data>["type"]]: Extract<all<Data>, { type: key }>;
  };
}
