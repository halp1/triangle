import type { Game as GameTypes } from "../..";

export interface Game {
  "game.ready": GameTypes.Ready;
  "game.abort": null | undefined;
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
      options: Record<string, unknown>;
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
  "game.start": null | undefined;
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
  "game.score": {
    scoreboard: GameTypes.Scoreboard[];
    match: GameTypes.MatchData;
  };
  "game.end": {
    leaderboard: GameTypes.Leaderboard[];
    scoreboard: GameTypes.Scoreboard[];
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
    data:
      | "early"
      | "wait"
      | {
          frame: number;
          game: GameTypes.State;
          overrides: Record<string, unknown>;
        };
  };

  "game.replay.ige": {
    gameid: number;
    iges: GameTypes.IGE[];
  };

  "game.replay.board": {
    boards: {
      board: {
        /** Board state */
        b: GameTypes.BoardSquare[][];
        /** Unknown*/
        f: number;
        /** Unknown*/
        g: number;
        /** Board width */
        w: number;
        /** Board height */
        h: number;
      };
      gameid: number;
    }[];
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
      killer: { gameid: number; type: "sizzle"; username?: null | string };
    };
  };

  "game.spectate": {
    players: {
      userid: string;
      gameid: number;
      alive: boolean;
      naturalorder: number;
      options: GameTypes.ReadyOptions;
    }[];
    match: GameTypes.MatchData;
  };
}
