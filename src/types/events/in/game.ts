import type { Game as GameTypes } from "../..";

export interface Game {
  "game.ready": GameTypes.Ready;
  "game.abort": void;
  "game.match": {
    gamemode: GameTypes.GameMode;
    modename: string;
    rb: {
      type: string;
      options: {
        ft: number;
        wb: number;
        gp: number;
      };
      leaderboard: GameTypes.Leaderboard[];
    };
    rrb: {
      type: string;
      options: {};
      scoreboard: {
        id: string;
        username: string;
        active: boolean;
        naturalorder: number;
        shadows: any[];
        shadowedBy: (null | string)[];
        alive: boolean;
        lifetime: number;
        stats: {
          apm: number | null;
          pps: number | null;
          vsscore: number | null;
          garbagesent: number;
          garbagereceived: number;
          kills: number;
          altitude: number;
          rank: number;
          targetingfactor: number;
          targetinggrace: number;
          btb: number;
          revives: number;
          escapeartist: number;
          blockrationing_app: number;
          blockrationing_final: number;
        };
      }[];
    };
  };
  "game.start": void;
  "game.advance": {
    scoreboard: {
      id: string;
      username: string;
      active: boolean;
      naturalorder: number;
      shadows: [];
      shadowedBy: [null, null];
      alive: boolean;
      lifetime: number;
      stats: {
        apm: number;
        pps: number;
        vsscore: number;
        garbagesent: number;
        garbagereceived: number;
        kills: 1;
        altitude: 0;
        rank: 1;
        targetingfactor: 3;
        targetinggrace: 0;
      };
    }[];
  };
  "game.score": {
    refereedata: { ft: number; wb: number; modename: string };
    leaderboard: GameTypes.Leaderboard[];
    victor: string;
  };
  "game.end": {
    leaderboard: GameTypes.Leaderboard[];
    scoreboard: GameTypes.Leaderboard[];
    xpPerUser: number;
    winners: {
      id: string;
      username: string;
      active: boolean;
      naturalorder: number;
      shadows: any[];
      shadowedBy: (null | any)[];
    }[];
  };
  "game.replay.state": {
    gameid: number;
    data: "early" | "wait";
  };

  "game.replay.ige": {
    gameid: number;
    iges: GameTypes.IGE[];
  };

  "game.replay.board": {
    boards: {
      0: {
        board: {
          /** Board state */
          b: GameTypes.BoardSquare[][];
          /** Frame number or turn */
          f: number;
          /** Game status or flag */
          g: number;
          /** Board width */
          w: number;
          /** Board height */
          h: number;
        };
        gameid: number;
      };
      1: {
        board: {
          /** Board state */
          b: GameTypes.BoardSquare[][];
          /** Frame number or turn */
          f: number;
          /** Game status or flag */
          g: number;
          /** Board width */
          w: number;
          /** Board height */
          h: number;
        };
        gameid: number;
      };
    };
  };
  "game.replay": {
    gameid: number;
    provisioned: number;
    frames: GameTypes.Replay.Frame[];
  };
  "game.replay.end": {
    gameid: number;
    data: {
      gameoverreason: GameTypes.GameOverReason;
      killer: { gameid: number; type: "sizzle"; username: null | string };
    };
  };

  "game.spectate": {
    id: number;
    data: {
      players: {
        userid: string;
        gameid: number;
        alive: boolean;
        naturalorder: number;
        options: GameTypes.ReadyOptions;
      }[];
      match: {
        gamemode: string;
        modename: string;
        rb: {
          type: "elimination";
          options: {
            ft: number;
            wb: number;
            gp: number;
          };
          leaderboard: {
            id: string;
            username: string;
            active: boolean;
            naturalorder: number;
            shadows: any[];
            shadowedBy: (null | any)[];
            wins: number;
            stats: {
              apm: number | null;
              pps: number | null;
              vsscore: number | null;
              garbagesent: number;
              garbagereceived: number;
              kills: number;
              altitude: number;
              rank: number;
              targetingfactor: number;
              targetinggrace: number;
              btb: number;
              revives: number;
            };
          }[];
        };
        rrb: {
          type: string;
          options: Record<string, unknown>;
          scoreboard: {
            sb: {
              stats: {
                rank: number;
                altitude: number;
                btb: number;
                revives: number;
              };
              allies: any[];
              gameid: number;
              specCount: number;
              speedrun: boolean;
              nearWR: boolean;
              lovers: boolean;
            }[];
          };
        };
      };
    };
  };
}
