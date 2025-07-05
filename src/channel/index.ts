const NodeError = Error;

export namespace ChannelAPI {
  export class Error extends NodeError {
    constructor(type: string, message: string) {
      super(`[CH API] ${type}: ${message}`);
    }
  }

  export const randomSessionID = (length = 20) =>
    Array.from(
      { length },
      () =>
        ["qwertyuiop[asdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890"][
          Math.floor(Math.random() * (26 + 26 + 10))
        ]
    ).join("");

  const config: Types.Config = {
    sessionID: randomSessionID(),
    host: "https://ch.tetr.io/api/",
    caching: true
  };

  export const getConfig = () => config;
  export const setConfig = (newConfig: Partial<Types.Config>) => {
    Object.assign(config, newConfig);
  };

  const cache: { [key: string]: { until: number; data: any } } = {};
  export const clearCache = () => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  };

  export interface GetOptions {
    sessionID?: string | null;
    host?: string;
  }

  export const get = async <Res = any>({
    route,
    args = {
      data: {},
      format: []
    },
    query = {},
    options = config
  }: {
    route: string;
    args?: {
      data: { [k: string]: string };
      format: string[];
    };
    query?: { [k: string]: string };
    options?: GetOptions;
  }): Promise<Res> => {
    let uri = route;

    args.format.forEach((arg) => {
      if (arg in args.data) {
        uri = uri.replaceAll(`:${arg}`, args.data[arg]);
      } else {
        throw new Error(
          "Argument Error",
          `Missing argument ${arg.toString()} in route ${route}`
        );
      }
    });

    Object.keys(query).forEach((key) => {
      uri += `?${key}=${query[key]}`;
    });

    if (config.caching && cache[uri]) {
      if (cache[uri].until > Date.now()) {
        return cache[uri].data;
      } else {
        delete cache[uri];
      }
    }

    let res: ChannelAPI.Types.Response;
    try {
      res = (await fetch(`${options.host || config.host}${uri}`, {
        headers:
          options.sessionID || config.sessionID
            ? {
                "X-Session-ID": options.sessionID || config.sessionID!
              }
            : {}
      }).then((r) => r.json())) as any;
      if (res.success === false) {
        throw new Error("Server Error", `${res.error.msg} at ${uri}`);
      } else {
        if (config.caching) {
          cache[uri] = {
            until: res.cache.cached_until,
            data: res.data
          };
        }
        return res.data;
      }
    } catch (e: any) {
      if (e instanceof Error) throw e;
      throw new Error("Network Error", `${e.message} at ${uri}`);
    }
  };

  export namespace generator {
    export const empty =
      <Res extends object, ResKey extends keyof Res | undefined = undefined>(
        route: string,
        res?: ResKey
      ) =>
      async (): Promise<
        ResKey extends undefined ? Res : Res[Extract<ResKey, keyof Res>]
      > => {
        const r = await get({ route });
        if (res) return r[res];
        return r;
      };
    export const args = <
      Req extends object,
      Res extends object,
      ArgValues extends any[],
      ResKey extends keyof Res | undefined = undefined
    >(
      route: string,
      res?: ResKey
    ) => {
      const base = route
        .split("/")
        .filter((v) => v.startsWith(":"))
        .map((v) => v.slice(1));
      async function getArgs(
        ...args: ArgValues | [Types.ArgsObject<Req>]
      ): Promise<
        ResKey extends undefined ? Res : Res[Extract<ResKey, keyof Res>]
      > {
        const argData: { [k: string]: string } = {};
        if (typeof args[0] === "string") {
          if (args.length !== base.length)
            throw new Error(
              "Argument Error",
              `Invalid number of arguments for ${route}: Expected ${base.length}, found ${args.length}`
            );
          base.forEach((v, i) => (argData[v as any] = args[i] as string));
        } else {
          base.forEach((v) => {
            if (!(v in args[0]))
              throw new Error(
                "Argument Error",
                `Missing argument ${v.toString()} for ${route}`
              );
            argData[v as any] = (args[0] as { [k: string]: string })[v as any];
          });
        }

        const r = await get({
          route,
          args: { data: argData, format: base as string[] }
        });
        if (res) return r[res];
        return r;
      }
      return getArgs;
    };

    export const query =
      <
        Res extends object,
        QueryParams extends object,
        ResKey extends keyof Res | undefined = undefined
      >(
        route: string,
        res?: ResKey
      ) =>
      async (
        query: QueryParams = {} as any
      ): Promise<
        ResKey extends undefined ? Res : Res[Extract<ResKey, keyof Res>]
      > => {
        const r = await get({ route, query: query as any });
        if (res) return r[res];
        return r;
      };

    export const argsAndQuery = <
      Req extends object,
      Res extends object,
      QueryParams extends object,
      ArgValues extends any[],
      ResKey extends keyof Res | undefined = undefined
    >(
      route: string,
      res?: ResKey
    ) => {
      const base = route
        .split("/")
        .filter((v) => v.startsWith(":"))
        .map((v) => v.slice(1));
      async function getArgsAndQuery(
        ...args:
          | [...ArgValues, QueryParams]
          | ArgValues
          | [Types.ArgsObject<Req>, QueryParams]
          | [Types.ArgsObject<Req>]
      ): Promise<
        ResKey extends undefined ? Res : Res[Extract<ResKey, keyof Res>]
      > {
        const argData: { [k: string]: string } = {};
        let query: QueryParams = {} as QueryParams;
        if (typeof args[0] === "string") {
          if (
            args.length === base.length + 1 &&
            typeof args[base.length] === "object"
          ) {
            query = args.pop() as QueryParams;
          }
          if (args.length !== base.length)
            throw new Error(
              "Argument Error",
              `Invalid number of arguments for ${route}: Expected ${base.length}, found ${args.length}`
            );
          base.forEach((v, i) => (argData[v as any] = args[i] as string));
        } else {
          base.forEach((v) => {
            if (!(v in args))
              throw new Error(
                "Argument Error",
                `Missing argument ${v.toString()} for ${route}`
              );
            argData[v as any] = (args[0] as { [k: string]: string })[v as any];
          });
          if (typeof args[1] === "object") {
            query = args[1] as QueryParams;
          }
        }

        const r = await get({
          route,
          args: { data: argData, format: base as string[] },
          query: query as any
        });
        if (res) return r[res];
        return r;
      }
      return getArgsAndQuery;
    };
  }

  export namespace general {
    export namespace Stats {
      /**
       * Some statistics about the service.
       */
      export interface Response {
        /**
         * The amount of users on the server, including anonymous accounts.
         */
        usercount: number;
        /**
         * The amount of users created a second (through the last minute).
         */
        usercount_delta: number;
        /**
         * The amount of anonymous accounts on the server.
         */
        anoncount: number;
        /**
         * The total amount of accounts ever created (including pruned anons etc.).
         */
        totalaccounts: number;
        /**
         * The amount of ranked (visible in TETRA LEAGUE leaderboard) accounts on the server.
         */
        rankedcount: number;
        /**
         * The amount of game records stored on the server.
         */
        recordcount: number;
        /**
         * The amount of games played across all users, including both off- and online modes.
         */
        gamesplayed: number;
        /**
         * The amount of games played a second (through the last minute).
         */
        gamesplayed_delta: number;
        /**
         * The amount of games played across all users, including both off- and online modes, excluding games that were not completed (e.g. retries)
         */
        gamesfinished: number;
        /**
         * The amount of seconds spent playing across all users, including both off- and online modes.
         */
        gametime: number;
        /**
         * The amount of keys pressed across all users, including both off- and online modes.
         */
        inputs: number;
        /**
         * The amount of pieces placed across all users, including both off- and online modes.
         */
        piecesplaced: number;
      }
    }
    /**
     * Gets statistics about TETR.IO
     */
    export const stats = generator.empty<Stats.Response>("general/stats");
    export namespace Activity {
      /**
       * A graph of user activity over the last 2 days. A user is seen as active if they logged in or received XP within the last 30 minutes.
       */
      export interface Response {
        /**
         * An array of plot points, newest points first.
         */
        activity: number[];
      }
      export interface Request {}
    }

    /**
     * Gets a graph of user activity over the last 2 days. A user is seen as active if they logged in or received XP within the last 30 minutes.
     */
    export const activity = generator.empty<Activity.Response, "activity">(
      "general/activity",
      "activity"
    );
  }

  export namespace users {
    /**
     * An object describing the user in detail.
     */
    export interface Response extends ChannelAPI.Types.User {}
    export interface Request {
      /**
       * The lowercase username or user ID to look up.
       */
      user: string;
    }

    export const get: {
      (user: string): Promise<Response>;
      ({ user }: { user: string }): Promise<Response>;
    } = generator.args<Request, Response, [string]>("users/:user");

    export namespace summaries {
      export namespace FourtyLines {
        /**
         * An object describing a summary of the user's 40 LINES games.
         */
        export interface Response
          extends ChannelAPI.Types.BaseSummaryResponse {}
        export interface Request {
          /**
           *  The lowercase username or user ID to look up.
           */
          user: string;
        }
      }

      export const fourtyLines: {
        (user: string): Promise<FourtyLines.Response>;
        ({ user }: { user: string }): Promise<FourtyLines.Response>;
      } = generator.args<FourtyLines.Request, FourtyLines.Response, [string]>(
        "users/:user/summaries/40l"
      );

      export namespace Blitz {
        /**
         * An object describing a summary of the user's BLITZ games.
         */
        export interface Response
          extends ChannelAPI.Types.BaseSummaryResponse {}
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const blitz: {
        (user: string): Promise<Blitz.Response>;
        ({ user }: { user: string }): Promise<Blitz.Response>;
      } = generator.args<Blitz.Request, Blitz.Response, [string]>(
        "users/:user/summaries/BLITZ"
      );

      export namespace QuickPlay {
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
        /**
         * An object describing a summary of the user's QUICK PLAY games.
         */
        export interface Response extends ChannelAPI.Types.BaseSummaryResponse {
          /**
           * The user's career best:
           */
          best: {
            /**
             * The user's best record, or null if the user hasn't placed one yet.
             */
            record?: ChannelAPI.Types.Record;
            /**
             * The rank said record had in global leaderboards at the end of the week, or -1 if it was not ranked.
             */
            rank: number;
          };
        }
      }
      export const quickPlay: {
        (user: string): Promise<QuickPlay.Response>;
        ({ user }: { user: string }): Promise<QuickPlay.Response>;
      } = generator.args<QuickPlay.Request, QuickPlay.Response, [string]>(
        "users/:user/summaries/zenith"
      );
      /** Alias of quickPlay */
      export const zenith = quickPlay;

      export namespace ExpertQuickPlay {
        /**
         * An object describing a summary of the user's EXPERT QUICK PLAY games.
         */
        export interface Response extends ChannelAPI.Types.BaseSummaryResponse {
          /**
           * The user's career best:
           */
          best: {
            /**
             * The user's best record, or null if the user hasn't placed one yet.
             */
            record?: ChannelAPI.Types.Record;
            /**
             * The rank said record had in global leaderboards at the end of the week, or -1 if it was not ranked.
             */
            rank: number;
          };
        }
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const expertQuickPlay: {
        (user: string): Promise<ExpertQuickPlay.Response>;
        ({ user }: { user: string }): Promise<ExpertQuickPlay.Response>;
      } = generator.args<
        ExpertQuickPlay.Request,
        ExpertQuickPlay.Response,
        [string]
      >("users/:user/summaries/zenithex");
      /** Alias of expertQuickPlay */
      export const zenthiex = expertQuickPlay;

      export namespace TetraLeague {
        /**
         * An object describing a summary of the user's TETRA LEAGUE standing.
         */
        export interface Response {
          gamesplayed: number;
          gameswon: number;
          glicko: number;
          rd?: number;
          decaying: boolean;
          tr: number;
          gxe: number;
          rank: string;
          bestrank?: string;
          apm?: number;
          pps?: number;
          vs?: number;
          standing?: number;
          standing_local?: number;
          percentile?: number;
          percentile_rank?: string;
          next_rank?: string;
          prev_rank?: string;
          next_at?: number;
          prev_at?: number;
          /**
           * An object mapping past season IDs to past season final placement information. A season will include the following:
           */
          past: {
            [key: string]: {
              /**
               * The season ID.
               */
              season: string;
              /**
               * The username the user had at the time.
               */
              username: string;
              /**
               * The country the user represented at the time.
               */
              country?: string;
              /**
               * This user's final position in the season's global leaderboards.
               */
              placement?: number;
              /**
               *  Whether the user was ranked at the time of the season's end.
               */
              ranked: boolean;
              /**
               * The amount of TETRA LEAGUE games played by this user.
               */
              gamesplayed: number;
              /**
               * The amount of TETRA LEAGUE games won by this user.
               */
              gameswon: number;
              /**
               * This user's final Glicko-2 rating.
               */
              glicko: number;
              /**
               * This user's final Glicko-2 Rating Deviation.
               */
              rd: number;
              /**
               *  This user's final TR (Tetra Rating).
               */
              tr: number;
              /**
               *  This user's final GLIXARE score (a % chance of beating an average player).
               */
              gxe: number;
              /**
               * This user's final letter rank. z is unranked.
               */
              rank: string;
              /**
               *  This user's highest achieved rank in the season.
               */
              bestrank?: string;
              /**
               *  This user's average APM (attack per minute) over the last 10 games in the season.
               */
              apm: number;
              /**
               * This user's average PPS (pieces per second) over the last 10 games in the season.
               */
              pps: number;
              /**
               * This user's average VS (versus score) over the last 10 games in the season.
               */
              vs: number;
            };
          };
        }
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const tetraLeague: {
        (user: string): Promise<TetraLeague.Response>;
        ({ user }: { user: string }): Promise<TetraLeague.Response>;
      } = generator.args<TetraLeague.Request, TetraLeague.Response, [string]>(
        "users/:user/summaries/league"
      );
      /** Alias of tetraLeague */
      export const tl = tetraLeague;

      export namespace Zen {
        /**
         * An object describing a summary of the user's ZEN progress.
         */
        export interface Response {
          /**
           *  The user's level.
           */
          level: number;
          /**
           * The user's score.
           */
          score: number;
        }
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const zen: {
        (user: string): Promise<Zen.Response>;
        ({ user }: { user: string }): Promise<Zen.Response>;
      } = generator.args<Zen.Request, Zen.Response, [string]>(
        "users/:user/summaries/zen"
      );

      export namespace Achievements {
        /**
         * An object containing all the user's achievements.
         */
        export interface Response {
          achievements: ChannelAPI.Types.Achievement[];
        }
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const achievements: {
        (user: string): Promise<Achievements.Response["achievements"]>;
        ({
          user
        }: {
          user: string;
        }): Promise<Achievements.Response["achievements"]>;
      } = generator.args<
        Achievements.Request,
        Achievements.Response,
        [string],
        "achievements"
      >("users/:user/summaries/achievements", "achievements");

      export namespace All {
        /**
         * An object containing all the user's summaries in one.
         */
        export interface Response {
          /**
           * See User Summary: 40 LINES.
           */
          "40l": FourtyLines.Response;
          /**
           * See User Summary: BLITZ.
           */
          blitz: Blitz.Response;
          /**
           * See User Summary: QUICK PLAY.
           */
          zenith: QuickPlay.Response;
          /**
           *  See User Summary: EXPERT QUICK PLAY.
           */
          zenithex: ExpertQuickPlay.Response;
          /**
           * See User Summary: TETRA LEAGUE.
           */
          league: TetraLeague.Response;
          /**
           * See User Summary: ZEN.
           */
          zen: Zen.Response;
          /**
           *  See User Summary: Achievements.
           */
          achievements: Achievements.Response;
        }
        export interface Request {
          /**
           * The lowercase username or user ID to look up.
           */
          user: string;
        }
      }
      export const all: {
        (user: string): Promise<All.Response>;
        ({ user }: { user: string }): Promise<All.Response>;
      } = generator.args<All.Request, All.Response, [string]>(
        "users/:user/summaries"
      );
    }

    export namespace Search {
      /**
       * An object describing the user found, or null if none found.
       */
      export interface Response {
        /**
         * The requested user:
         */
        users?: {
          /**
           *  The user's internal ID.
           */
          _id: string;
          /**
           * The user's username.
           */
          username: string;
        }[];
      }

      export type Query =
        | `discord:id:${string}` // Discord user ID (snowflake)
        | `discord:username:${string}` // Discord username
        | `twitch:id:${string}` // Twitch user ID
        | `twitch:username:${string}` // Twitch username (URL)
        | `twitch:display_username:${string}` // Twitch display name
        | `twitter:id:${string}` // X (Twitter) user ID
        | `twitter:username:${string}` // X handle (URL)
        | `twitter:display_username:${string}` // X display name
        | `reddit:id:${string}` // Reddit user ID
        | `reddit:username:${string}` // Reddit username
        | `youtube:id:${string}` // YouTube user ID
        | `youtube:username:${string}` // YouTube display name
        | `steam:id:${string}` // SteamID
        | `steam:username:${string}`; // Steam display name

      export interface Request {
        /**
         * The social connection to look up. Must be one of:
					discord:id:<snowflake> - a Discord user ID
					discord:username:<username> - a Discord username
					twitch:id:<userid> - a Twitch user ID
					twitch:username:<username> - a Twitch username (as used in the URL)
					twitch:display_username:<username> - a Twitch display name (may include Unicode)
					twitter:id:<userid> - an X user ID
					twitter:username:<handle> - an X handle (as used in the URL)
					twitter:display_username:<username> - an X display name (may include Unicode)
					reddit:id:<userid> - a Reddit user ID
					reddit:username:<username> - a Reddit username
					youtube:id:<userid> - a YouTube user ID (as used in the URL)
					youtube:username:<username> - a YouTube display name
					steam:id:<steamid> - a SteamID
					steam:username:<username> - a Steam display name
         */
        query: Query;
      }
    }
    export const search: {
      (query: Search.Query): Promise<Search.Response["users"]>;
      ({ query }: { query: Search.Query }): Promise<Search.Response["users"]>;
    } = generator.args<Search.Request, Search.Response, [string], "users">(
      "users/search/:query",
      "users"
    );

    export namespace Leaderboard {
      export interface Response {
        /**
         * The matched users:
         */
        entries: ChannelAPI.Types.LeaderboardEntry[];
      }
      export interface Request {
        /**
         *  The leaderboard to sort users by. Must be one of:
         * league — the TETRA LEAGUE leaderboard.
         * xp — the XP leaderboard.
         * ar — the Achievement Rating leaderboard.
         */
        leaderboard: "league" | "xp" | "ar";
      }
      export interface QueryParams {
        /**
         * The upper bound. Use this to paginate downwards: take the lowest seen prisecter and pass that back through this field to continue scrolling.
         */
        after?: string;
        /**
         * The lower bound. Use this to paginate upwards: take the highest seen prisecter and pass that back through this field to continue scrolling. If set, the search order is reversed (returning the lowest items that match the query)
         */
        before?: string;
        /**
         * The amount of entries to return, between 1 and 100. 50 by default.
         */
        limit?: number;
        /**
         *  The ISO 3166-1 country code to filter to. Leave unset to not filter by country.
         */
        country?: string;
      }
    }
    export const leaderboard: {
      (
        leaderboard: Leaderboard.Request["leaderboard"]
      ): Promise<Leaderboard.Response["entries"]>;
      ({
        leaderboard
      }: {
        leaderboard: Leaderboard.Request["leaderboard"];
      }): Promise<Leaderboard.Response["entries"]>;
      (
        leaderboard: Leaderboard.Request["leaderboard"],
        query: Leaderboard.QueryParams
      ): Promise<Leaderboard.Response["entries"]>;
      (
        { leaderboard }: { leaderboard: Leaderboard.Request["leaderboard"] },
        query: Leaderboard.QueryParams
      ): Promise<Leaderboard.Response["entries"]>;
    } = generator.argsAndQuery<
      Leaderboard.Request,
      Leaderboard.Response,
      Leaderboard.QueryParams,
      [Leaderboard.Request["leaderboard"]],
      "entries"
    >("users/by/:leaderboard", "entries");
    /** Alias of leaderboard */
    export const lb = leaderboard;

    export namespace History {
      export interface Response {
        /**
         * The matched users:
         */
        entries: ChannelAPI.Types.HistoricalLeaderboardEntry[];
      }
      export interface Request {
        /**
         *  The leaderboard to sort users by. Must be:
         * league — the TETRA LEAGUE leaderboard.
         */
        leaderboard: "league";
        /**
         * The season to look up.
         */
        season: string;
      }
      export type QueryParams = (
        | {
            /**
             * The upper bound. Use this to paginate downwards: take the lowest seen prisecter and pass that back through this field to continue scrolling.
             */
            after?: string;
          }
        | {
            /**
             * The lower bound. Use this to paginate upwards: take the highest seen prisecter and pass that back through this field to continue scrolling. If set, the search order is reversed (returning the lowest items that match the query)
             */
            before?: string;
          }
      ) & {
        /**
         *  The amount of entries to return, between 1 and 100. 50 by default.
         */
        limit?: number;
        /**
         * The ISO 3166-1 country code to filter to. Leave unset to not filter by country.
         */
        country?: string;
      };
    }
    export const history: {
      (
        leaderboard: History.Request["leaderboard"],
        season: History.Request["season"]
      ): Promise<History.Response["entries"]>;
      ({
        leaderboard,
        season
      }: History.Request): Promise<History.Response["entries"]>;
      (
        leaderboard: History.Request["leaderboard"],
        season: History.Request["season"],
        query: History.QueryParams
      ): Promise<History.Response["entries"]>;
      (
        { leaderboard, season }: History.Request,
        query: History.QueryParams
      ): Promise<History.Response["entries"]>;
    } = generator.argsAndQuery<
      History.Request,
      History.Response,
      History.QueryParams,
      [History.Request["leaderboard"], History.Request["season"]],
      "entries"
    >("users/history/:leaderboard/:season", "entries");

    export namespace PersonalRecords {
      export type Response = ChannelAPI.Types.Record[];

      export interface Request {
        /**
         * The lowercase username or user ID to look up.
         */
        user: string;
        /**
         * The game mode to look up. One of:
         * 40l — their 40 LINES records.
         * blitz — their BLITZ records.
         * zenith — their QUICK PLAY records.
         * zenithex — their EXPERT QUICK PLAY records.
         * league — their TETRA LEAGUE history.
         */
        gamemode: "40l" | "blitz" | "zenith" | "zenithex" | "league";
        /**
         * The personal leaderboard to look up. One of:
         * top — their top scores.
         * recent — their most recently placed records.
         * progression — their top scores (PBs only).
         */
        leaderboard: "top" | "recent" | "progression";
      }
      export type QueryParams = (
        | {
            /**
             * The upper bound. Use this to paginate downwards: take the lowest seen prisecter and pass that back through this field to continue scrolling.
             */
            after?: string;
          }
        | {
            /**
             * The lower bound. Use this to paginate upwards: take the highest seen prisecter and pass that back through this field to continue scrolling. If set, the search order is reversed (returning the lowest items that match the query)
             */
            before?: string;
          }
      ) & {
        /**
         * The amount of entries to return, between 1 and 100. 50 by default.
         */
        limit?: number;
      };
    }
    export const personalRecords: {
      (
        user: PersonalRecords.Request["user"],
        gamemode: PersonalRecords.Request["gamemode"],
        leaderboard: PersonalRecords.Request["leaderboard"]
      ): Promise<PersonalRecords.Response["entries"]>;
      ({
        user,
        gamemode,
        leaderboard
      }: PersonalRecords.Request): Promise<PersonalRecords.Response["entries"]>;
      (
        user: PersonalRecords.Request["user"],
        gamemode: PersonalRecords.Request["gamemode"],
        leaderboard: PersonalRecords.Request["leaderboard"],
        query: PersonalRecords.QueryParams
      ): Promise<PersonalRecords.Response["entries"]>;
      (
        { user, gamemode, leaderboard }: PersonalRecords.Request,
        query: PersonalRecords.QueryParams
      ): Promise<PersonalRecords.Response["entries"]>;
    } = generator.argsAndQuery<
      PersonalRecords.Request,
      PersonalRecords.Response,
      PersonalRecords.QueryParams,
      [
        PersonalRecords.Request["user"],
        PersonalRecords.Request["gamemode"],
        PersonalRecords.Request["leaderboard"]
      ],
      "entries"
    >("users/:user/records/:gamemode/:leaderboard", "entries");
    /** Alias of personalRecords */
    export const records = personalRecords;
  }

  export namespace records {
    export namespace Leaderboard {
      export interface Response {
        /**
         *  The requested records. The record will additionally include:
         */
        entries: (ChannelAPI.Types.Record & {
          /**
           * The prisecter of this entry:
           */
          p: {
            /**
             * The primary sort key.
             */
            pri: number;
            /**
             *  The secondary sort key.
             */
            sec: number;
            /**
             *  The tertiary sort key.
             */
            ter: number;
          };
        })[];
      }
      export interface Request {
        /**
         * The leaderboard to look up (e.g. 40l_global, blitz_country_XM, zenith_global@2024w31). Leaderboard IDs consist of:
         * the game mode, e.g. 40l,
         * the scope, either _global or a country, e.g. _country_XM,
         * an optional Revolution ID, e.g. @2024w31.
         */
        leaderboard: string;
      }
      export type QueryParams = (
        | {
            /**
             *  The upper bound. Use this to paginate downwards: take the lowest seen prisecter and pass that back through this field to continue scrolling.
             */
            after?: string;
          }
        | {
            /**
             * The lower bound. Use this to paginate upwards: take the highest seen prisecter and pass that back through this field to continue scrolling. If set, the search order is reversed (returning the lowest items that match the query)
             */
            before?: string;
          }
      ) & {
        /**
         * The amount of entries to return, between 1 and 100. 50 by default.
         */
        limit?: number;
      };
    }
    // export const leaderboard = createAPIMethod<
    //   Leaderboard.Request,
    //   Leaderboard.Response,
    //   Leaderboard.QueryParams
    // >("/records/:leaderboard", ["leaderboard"], ["after", "before", "limit"]);
    export const leaderboard: {
      (
        leaderboard: Leaderboard.Request["leaderboard"]
      ): Promise<Leaderboard.Response["entries"]>;
      ({
        leaderboard
      }: {
        leaderboard: Leaderboard.Request["leaderboard"];
      }): Promise<Leaderboard.Response["entries"]>;
      (
        leaderboard: Leaderboard.Request["leaderboard"],
        query: Leaderboard.QueryParams
      ): Promise<Leaderboard.Response["entries"]>;
      (
        { leaderboard }: { leaderboard: Leaderboard.Request["leaderboard"] },
        query: Leaderboard.QueryParams
      ): Promise<Leaderboard.Response["entries"]>;
    } = generator.argsAndQuery<
      Leaderboard.Request,
      Leaderboard.Response,
      Leaderboard.QueryParams,
      [Leaderboard.Request["leaderboard"]],
      "entries"
    >("/records/:leaderboard", "entries");
    /** Alias of leaderboard */
    export const lb = leaderboard;

    export namespace Search {
      export interface Response {
        /**
         * If successful and found, the requested record.
         */
        record?: ChannelAPI.Types.Record;
      }
      export interface Request {}
      export interface QueryParams {
        /**
         * The user ID to look up.
         */
        user: string;
        /**
         * The game mode to look up.
         */
        gamemode: string;
        /**
         * The timestamp of the record to find.
         */
        ts: number;
      }
    }
    export const search: {
      (query: Search.QueryParams): Promise<Search.Response>;
    } = generator.query<Search.Response, Search.QueryParams>("records/search");
  }

  export namespace news {
    export namespace All {
      export interface Response {
        /**
         * The latest news items:
         */
        news: ChannelAPI.Types.NewsItem[];
      }

      export interface Request {}
      export interface QueryParams {
        /**
         *  The amount of entries to return, between 1 and 100. 25 by default.
         */
        limit?: number;
      }
    }
    export const all: {
      (): Promise<All.Response>;
      (query: All.QueryParams): Promise<All.Response>;
    } = generator.query<All.Response, All.QueryParams>("news/");

    export namespace Latest {
      export interface Response {
        /**
         * The latest news items:
         */
        news: ChannelAPI.Types.NewsItem[];
      }
      export interface Request {
        /**
         * The news stream to look up (either "global" or "user_{ userID }").
         */
        stream: ChannelAPI.Types.StreamID;
      }
      export interface QueryParams {
        /**
         * The amount of entries to return, between 1 and 100. 25 by default.
         */
        limit?: number;
      }
    }
    export const latest: {
      (stream: Latest.Request["stream"]): Promise<Latest.Response["news"]>;
      ({
        stream
      }: {
        stream: Latest.Request["stream"];
      }): Promise<Latest.Response["news"]>;
      (
        stream: Latest.Request["stream"],
        query: Latest.QueryParams
      ): Promise<Latest.Response["news"]>;
      ({
        stream,
        query
      }: {
        stream: Latest.Request["stream"];
        query: Latest.QueryParams;
      }): Promise<Latest.Response["news"]>;
    } = generator.argsAndQuery<
      Latest.Request,
      Latest.Response,
      Latest.QueryParams,
      [Latest.Request["stream"]],
      "news"
    >("news/:stream", "news");
    /** Alias of latest */
    export const stream = latest;
  }
  export namespace labs {
    export namespace ScoreFlow {
      export interface Response {
        /**
         * The timestamp of the oldest record found.
         */
        startTime: number;
        /**
         *  The points in the chart:
         */
        points: [
          /**
           * The timestamp offset. Add startTime to get the true timestamp.
           */
          number,
          /**
           *  Whether the score set was a PB. 0 = not a PB, 1 = PB.
           */
          0 | 1,
          /**
           * The score achieved. (For 40 LINES, this is negative.)
           */
          number
        ][];
      }
      export interface Request {
        /**
         *  The lowercase username or user ID to look up.
         */
        user: string;
        /**
         * The game mode to look up.
         */
        gamemode: string;
      }
    }
    export const scoreflow: {
      (user: string, gamemode: string): Promise<ScoreFlow.Response>;
      ({ user, gamemode }: ScoreFlow.Request): Promise<ScoreFlow.Response>;
    } = generator.args<ScoreFlow.Request, ScoreFlow.Response, [string, string]>(
      "labs/scoreflow/:user/:gamemode"
    );

    export namespace LeagueFlow {
      export interface Response {
        /**
         * The timestamp of the oldest record found.
         */
        startTime: number;
        /**
         * The points in the chart:
         */
        points: [
          /**
           * The timestamp offset. Add startTime to get the true timestamp.
           */
          number,
          /**
           *  The result of the match, where:
           * 1 = victory,
           * 2 = defeat,
           * 3 = victory by disqualification,
           * 4 = defeat by disqualification,
           * 5 = tie,
           * 6 = no contest,
           * 7 = match nullified.
           */
          1 | 2 | 3 | 4 | 5 | 6 | 7,
          /**
           * The user's TR after the match.
           */
          number,
          /**
           * The opponent's TR before the match. (If the opponent was unranked, same as 2.)
           */
          number
        ][];
      }
      export interface Request {
        /**
         * The lowercase username or user ID to look up.
         */
        user: string;
      }
    }
    export const leagueflow: {
      (user: string): Promise<LeagueFlow.Response>;
      ({ user }: { user: string }): Promise<LeagueFlow.Response>;
    } = generator.args<LeagueFlow.Request, LeagueFlow.Response, [string]>(
      "labs/leagueflow/:user"
    );
  }

  export namespace Achievements {
    export interface Response {
      /**
       * The achievement info.
       */
      achievement: ChannelAPI.Types.Achievement;
      /**
       * The entries in the achievement's leaderboard:
       */
      leaderboard: ChannelAPI.Types.AchievementLeaderboardEntry[];
      /**
       *  Scores required to obtain the achievement:
       */
      cutoffs: ChannelAPI.Types.AchievementCutoffs;
    }
    export interface Request {
      /**
       *  The achievement ID to look up.
       */
      k: number;
    }
  }
  export const achievements: {
    (k: number): Promise<Achievements.Response>;
    ({ k }: { k: number }): Promise<Achievements.Response>;
  } = generator.args<Achievements.Request, Achievements.Response, [number]>(
    "achievements/:k"
  );

  // TYPES
  export namespace Types {
    export type ArgsObject<Req extends object> = { [k in keyof Req]: Req[k] };

    export interface Config {
      sessionID: string | null;
      /** Must include the trailing slash. Include the full url. Example: https://ch.tetr.io/api/ */
      host: string;
      caching: boolean;
    }

    /**
     * Cache is not shared between workers. Load balancing may therefore give you unexpected responses. To use the same worker, pass the same X-Session-ID header for all requests that should use the same cache.
     */
    export interface Cache {
      /**
       * Whether the cache was hit. Either "hit", "miss", or "awaited" (resource was already being requested by another client)
       */
      status: "hit" | "miss" | "awaited";
      /**
       * When this resource was cached.
       */
      cached_at: number;
      /**
       *  When this resource's cache expires.
       */
      cached_until: number;
    }

    export interface SuccessfulResponse<Data = any> {
      /** Whether the request was successful */
      success: true;
      /** If successful, data about how this request was cached */
      cache: Cache;
      /** If successful, the requested data */
      data: Data;
    }

    export interface UnsuccessfulResponse {
      /** Whether the request was successful */
      success: false;
      /** If unsuccessful, the reason the request failed */
      error: { msg: string };
    }

    export type Response<Data = any> =
      | SuccessfulResponse<Data>
      | UnsuccessfulResponse;

    export interface User {
      /**
       * The user's internal ID.
       */
      _id: string;
      /**
       * The user's username.
       */
      username: string;
      /**
       * The user's role (one of "anon", "user", "bot", "halfmod", "mod", "admin", "sysop", "hidden", "banned").
       */
      role:
        | "anon"
        | "user"
        | "bot"
        | "halfmod"
        | "mod"
        | "admin"
        | "sysop"
        | "hidden"
        | "banned";
      /**
       * When the user account was created. If not set, this account was created before join dates were recorded.
       */
      ts?: string;
      /**
       * If this user is a bot, the bot's operator.
       */
      botmaster?: string;
      /**
       * The user's badges:
       */
      badges: {
        /**
         * The badge's internal ID, and the filename of the badge icon (all PNGs within /res/badges/). Note that badge IDs may include forward slashes. Please do not encode them! Follow the folder structure.
         */
        id: string;
        /**
         * The badge's group ID. If multiple badges have the same group ID, they are rendered together.
         */
        group?: string;
        /**
         * The badge's label, shown when hovered.
         */
        label: string;
        /**
         * The badge's timestamp, if shown.
         */
        ts?: string;
      }[];
      /**
       * The user's XP in points.
       */
      xp: number;
      /**
       * The amount of online games played by this user. If the user has chosen to hide this statistic, it will be -1.
       */
      gamesplayed: number;
      /**
       * The amount of online games won by this user. If the user has chosen to hide this statistic, it will be -1.
       */
      gameswon: number;
      /**
       * The amount of seconds this user spent playing, both on- and offline. If the user has chosen to hide this statistic, it will be -1.
       */
      gametime: number;
      /**
       * The user's ISO 3166-1 country code, or null if hidden/unknown. Some vanity flags exist.
       */
      country?: string;
      /**
       * Whether this user currently has a bad standing (recently banned).
       */
      badstanding?: boolean;
      /**
       * Whether this user is currently supporting TETR.IO <3
       */
      supporter: boolean;
      /**
       * An indicator of their total amount supported, between 0 and 4 inclusive.
       */
      supporter_tier: number;
      /**
       * This user's avatar ID. Get their avatar at https://tetr.io/user-content/avatars/{ USERID }.jpg?rv={ AVATAR_REVISION }
       */
      avatar_revision?: number;
      /**
       * This user's banner ID. Get their banner at https://tetr.io/user-content/banners/{ USERID }.jpg?rv={ BANNER_REVISION }. Ignore this field if the user is not a supporter.
       */
      banner_revision?: number;
      /**
       * This user's "About Me" section. Ignore this field if the user is not a supporter.
       */
      bio?: string;
      /**
       * This user's third party connections:
       */
      connections: {
        /**
         * This user's connection to Discord:
         */
        discord?: {
          /**
           * This user's Discord ID.
           */
          id: string;
          /**
           * This user's Discord username.
           */
          username: string;
          /**
           * Same as username.
           */
          display_username: string;
        };
        /**
         * This user's connection to Twitch:
         */
        twitch?: {
          /**
           * This user's Twitch user ID.
           */
          id: string;
          /**
           * This user's Twitch username (as used in the URL).
           */
          username: string;
          /**
           * This user's Twitch display name (may include Unicode).
           */
          display_username: string;
        };
        /**
         * This user's connection to X (kept in the API as twitter for readability):
         */
        twitter?: {
          /**
           * This user's X user ID.
           */
          id: string;
          /**
           * This user's X handle (as used in the URL).
           */
          username: string;
          /**
           * This user's X display name (may include Unicode).
           */
          display_username: string;
        };
        /**
         * This user's connection to Reddit:
         */
        reddit?: {
          /**
           * This user's Reddit user ID.
           */
          id: string;
          /**
           * This user's Reddit username.
           */
          username: string;
          /**
           * Same as username.
           */
          display_username: string;
        };
        /**
         * This user's connection to YouTube:
         */
        youtube?: {
          /**
           * This user's YouTube user ID (as used in the URL).
           */
          id: string;
          /**
           * This user's YouTube display name.
           */
          username: string;
          /**
           * Same as username.
           */
          display_username: string;
        };
        /**
         * This user's connection to Steam:
         */
        steam?: {
          /**
           * This user's SteamID.
           */
          id: string;
          /**
           * This user's Steam display name.
           */
          username: string;
          /**
           * Same as username.
           */
          display_username: string;
        };
      };
      /**
       * The amount of players who have added this user to their friends list.
       */
      friend_count: number;
      /**
       * This user's distinguishment banner, if any. Must at least have:
       */
      distinguishment?: {
        /**
         * The type of distinguishment banner.
         */
        type: string;
      };
      /**
       * This user's featured achievements. Up to three integers which correspond to Achievement IDs.
       */
      achievements: number[];
      /**
       * This user's Achievement Rating.
       */
      ar: number;
      /**
       * The breakdown of the source of this user's Achievement Rating:
       */
      ar_counts: {
        /**
         * The amount of ranked Bronze achievements this user has.
         */
        1?: number;
        /**
         * The amount of ranked Silver achievements this user has.
         */
        2?: number;
        /**
         * The amount of ranked Gold achievements this user has.
         */
        3?: number;
        /**
         * The amount of ranked Platinum achievements this user has.
         */
        4?: number;
        /**
         * The amount of ranked Diamond achievements this user has.
         */
        5?: number;
        /**
         * The amount of ranked Issued achievements this user has.
         */
        100?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 100 with.
         */
        t100?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 50 with.
         */
        t50?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 25 with.
         */
        t25?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 10 with.
         */
        t10?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 5 with.
         */
        t5?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 3 with.
         */
        t3?: number;
      };

      /**
       * The user's previous usernames
       */
      oldusernames: {
        /**
         * The username the user used.
         */
        username: string;
        /**
         * The time at which the user changed their username away from this username.
         */
        ts?: number;
      }[];
    }

    export interface BaseSummaryResponse {
      /**
       * The user's record, or null if never played/ hasn't played this week.
       */
      record?: ChannelAPI.Types.Record;
      /**
       * The user's rank in global leaderboards, or -1 if not in global leaderboards.
       */
      rank: number;
      /**
       * The user's rank in their country's leaderboards, or -1 if not in any.
       */
      rank_local: number;
    }

    /**
     * Achieved scores and matches are saved into Record objects. While these may change in structure drastically, the most important parts of their structure is outlined below:
     */
    export interface Record {
      /**
       * The Record's ID.
       */
      _id: string;
      /**
       * The Record's ReplayID.
       */
      replayid: string;
      /**
       * Whether the Replay has been pruned.
       */
      stub: boolean;
      /**
       * The played game mode.
       */
      gamemode: string;
      /**
       *  Whether this is the user's current personal best in the game mode.
       */
      pb: boolean;
      /**
       *  Whether this was once the user's personal best in the game mode.
       */
      oncepb: boolean;
      /**
       *  The time the Record was submitted.
       */
      ts: string;
      /**
       * If revolved away, the revolution it belongs to.
       */
      revolution?: string;
      /**
       *  The user owning the Record:
       */
      user: {
        /**
         * The user's user ID.
         */
        id: string;
        /**
         *  The user's username.
         */
        username: string;
        /**
         * The user's avatar revision (for obtaining avatar URLs).
         */
        avatar_revision?: number;
        /**
         *  The user's banner revision (for obtaining banner URLs).
         */
        banner_revision?: number;
        /**
         * The user's country, if public.
         */
        country?: string;
        /**
         * Whether the user is supporting TETR.IO.
         */
        supporter: boolean;
      };
      /**
       * Other users mentioned in the Record. Same format as user. If not empty, this is a multiplayer game (this changes the format of results)
       */
      otherusers: any;
      /**
       * The leaderboards this Record is mentioned in.
       */
      leaderboards: string[];
      /**
       * Whether this Record is disputed.
       */
      disputed: boolean;
      /**
       * The results of this Record:
       */
      results: any;
      /**
       *  Extra metadata for this Record:
       */
      extras: any;
    }
    /**
     * Achievements may look daunting with their short names, but they are not as difficult as they look. Here's the important parts of the structure:
     */
    export interface Achievement {
      /**
       * The Achievement ID, for every type of achievement.
       */
      k: number;
      /**
       * The category of the achievement.
       */
      category: string;
      /**
       *  The primary name of the achievement.
       */
      name: string;
      /**
       *  The objective of the achievement.
       */
      object: string;
      /**
       *  The flavor text of the achievement.
       */
      desc: string;
      /**
       * The order of this achievement in its category.
       */
      o: number;
      /**
       *  The rank type of this achievement:
       */
      rt:
        | /**
         *PERCENTILE — ranked by percentile cutoffs (5% Diamond, 10% Platinum, 30% Gold, 50% Silver, 70% Bronze)
         */
        1 /**
         *ISSUE — always has the ISSUED rank
         */
        | 2 /**
         * ZENITH — ranked by QUICK PLAY floors
         */
        | 3 /**
         * PERCENTILELAX — ranked by percentile cutoffs (5% Diamond, 20% Platinum, 60% Gold, 100% Silver)
         */
        | 4 /**
         * PERCENTILEVLAX — ranked by percentile cutoffs (20% Diamond, 50% Platinum, 100% Gold)
         */
        | 5 /**
         * PERCENTILEMLAX — ranked by percentile cutoffs (10% Diamond, 20% Platinum, 50% Gold, 100% Silver)
         */
        | 6;
      /**
       * The value type of this achievement:
       */
      vt:
        | /**
         * NONE — no value
         */
        0 /**
         *  NUMBER — V is a positive number
         */
        | 1 /**
         *  TIME — V is a positive amount of milliseconds
         */
        | 2 /**
         *  TIME_INV — V is a negative amount of milliseconds; negate it before displaying
         */
        | 3 /**
         * FLOOR — V is an altitude, A is a floor number
         */
        | 4 /**
         * ISSUE — V is the negative time of issue
         */
        | 5 /**
         * NUMBER_INV — V is a negative number; negate it before displaying
         */
        | 6;
      /**
       * The AR type of this achievement:
       */
      art:
        | /**
         * UNRANKED — no AR is given
         */
        0 /**
         *  RANKED — AR is given for medal ranks
         */
        | 1 /**
         *  COMPETITIVE — AR is given for medal ranks and leaderboard positions
         */
        | 2;
      /**
       *  The minimum score required to obtain the achievement.
       */
      min: number;
      /**
       * The amount of decimal placed to show.
       */
      deci: number;
      /**
       * Whether this achievement is usually not shown.
       */
      hidden: boolean;
    }

    export interface LeaderboardEntry {
      /**
       * The user's internal ID.
       */
      _id: string;
      /**
       * The user's username.
       */
      username: string;
      /**
       * The user's role (one of "anon", "user", "bot", "halfmod", "mod", "admin", "sysop").
       */
      role: string;
      /**
       * When the user account was created. If not set, this account was created before join dates were recorded.
       */
      ts?: string;
      /**
       *  The user's XP in points.
       */
      xp: number;
      /**
       * The user's ISO 3166-1 country code, or null if hidden/unknown. Some vanity flags exist.
       */
      country?: string;
      /**
       * Whether this user is currently supporting TETR.IO <3
       */
      supporter: boolean;
      /**
       * This user's current TETRA LEAGUE standing:
       */
      league: {
        /**
         * The amount of TETRA LEAGUE games played by this user.
         */
        gamesplayed: number;
        /**
         * The amount of TETRA LEAGUE games won by this user.
         */
        gameswon: number;
        /**
         * This user's TR (Tetra Rating).
         */
        tr: number;
        /**
         * This user's GLIXARE.
         */
        gxe: number;
        /**
         * This user's letter rank.
         */
        rank: string;
        /**
         * This user's highest achieved rank this season.
         */
        bestrank: string;
        /**
         * This user's Glicko-2 rating.
         */
        glicko: number;
        /**
         *  This user's Glicko-2 Rating Deviation.
         */
        rd: number;
        /**
         * This user's average APM (attack per minute) over the last 10 games.
         */
        apm: number;
        /**
         * This user's average PPS (pieces per second) over the last 10 games.
         */
        pps: number;
        /**
         * This user's average VS (versus score) over the last 10 games.
         */
        vs: number;
        /**
         * Whether this user's RD is rising (has not played in the last week).
         */
        decaying: boolean;
      };
      /**
       *  The amount of online games played by this user. If the user has chosen to hide this statistic, it will be -1.
       */
      gamesplayed: number;
      /**
       * The amount of online games won by this user. If the user has chosen to hide this statistic, it will be -1.
       */
      gameswon: number;
      /**
       * The amount of seconds this user spent playing, both on- and offline. If the user has chosen to hide this statistic, it will be -1.
       */
      gametime: number;
      /**
       * This user's Achievement Rating.
       */
      ar: number;
      /**
       *  The breakdown of the source of this user's Achievement Rating:
       */
      ar_counts: {
        /**
         * The amount of ranked Bronze achievements this user has.
         */
        bronze?: number;
        /**
         * The amount of ranked Silver achievements this user has.
         */
        silver?: number;
        /**
         * The amount of ranked Gold achievements this user has.
         */
        gold?: number;
        /**
         * The amount of ranked Platinum achievements this user has.
         */
        platinum?: number;
        /**
         * The amount of ranked Diamond achievements this user has.
         */
        diamond?: number;
        /**
         *  The amount of competitive achievements this user has ranked into the top 100 with.
         */
        t100?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 50 with.
         */
        t50?: number;
        /**
         *  The amount of competitive achievements this user has ranked into the top 25 with.
         */
        t25?: number;
        /**
         *  The amount of competitive achievements this user has ranked into the top 10 with.
         */
        t10?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 5 with.
         */
        t5?: number;
        /**
         * The amount of competitive achievements this user has ranked into the top 3 with.
         */
        t3?: number;
      };
      /**
       * The prisecter of this entry:
       */
      p: {
        /**
         * The primary sort key.
         */
        pri: number;
        /**
         * The secondary sort key.
         */
        sec: number;
        /**
         * The tertiary sort key.
         */
        ter: number;
      };
    }

    export interface HistoricalLeaderboardEntry {
      /**
       * The user's internal ID.
       */
      _id: string;
      /**
       *  The season ID.
       */
      season: string;
      /**
       *  The username the user had at the time.
       */
      username: string;
      /**
       * The country the user represented at the time.
       */
      country?: string;
      /**
       *  This user's final position in the season's global leaderboards.
       */
      placement: number;
      /**
       * Whether the user was ranked at the time of the season's end.
       */
      ranked: boolean;
      /**
       * The amount of TETRA LEAGUE games played by this user.
       */
      gamesplayed: number;
      /**
       *  The amount of TETRA LEAGUE games won by this user.
       */
      gameswon: number;
      /**
       * This user's final Glicko-2 rating.
       */
      glicko: number;
      /**
       * This user's final Glicko-2 Rating Deviation.
       */
      rd: number;
      /**
       * This user's final TR (Tetra Rating).
       */
      tr: number;
      /**
       * This user's final GLIXARE score (a % chance of beating an average player).
       */
      gxe: number;
      /**
       * This user's final letter rank. z is unranked.
       */
      rank: string;
      /**
       * This user's highest achieved rank in the season.
       */
      bestrank?: string;
      /**
       * This user's average APM (attack per minute) over the last 10 games in the season.
       */
      apm: number;
      /**
       *  This user's average PPS (pieces per second) over the last 10 games in the season.
       */
      pps: number;
      /**
       *  This user's average VS (versus score) over the last 10 games in the season.
       */
      vs: number;
      /**
       * The prisecter of this entry:
       */
      p: {
        /**
         *  The primary sort key.
         */
        pri: number;
        /**
         * The secondary sort key.
         */
        sec: number;
        /**
         * The tertiary sort key.
         */
        ter: number;
      };
    }

    export type StreamID = "global" | `user_${string}`;

    /**
     * News data may be stored in different formats depending on the type of news item. Here's all the types with their data structures.
     */
    export type NewsData =
      | {
          /**
           * When a user's new personal best enters a global leaderboard. Seen in the global stream only.
           */
          leaderboard: {
            /**
             * The username of the person who got the leaderboard spot.
             */
            username: string;
            /**
             * The game mode played.
             */
            gametype: string;
            /**
             *  The global rank achieved.
             */
            rank: number;
            /**
             * The result (score or time) achieved.
             */
            result: number;
            /**
             * The replay's shortID.
             */
            replayid: string;
          };
        }
      | {
          /**
           * When a user gets a personal best. Seen in user streams only.
           */
          personalbest: {
            /**
             * The username of the player.
             */
            username: string;
            /**
             *  The game mode played.
             */
            gametype: string;
            /**
             * The result (score or time) achieved.
             */
            result: number;
            /**
             * The replay's shortID.
             */
            replayid: string;
          };
        }
      | {
          /**
           *  When a user gets a badge. Seen in user streams only.
           */
          badge: {
            /**
             * The username of the player.
             */
            username: string;
            /**
             * The badge's internal ID, and the filename of the badge icon (all PNGs within /res/badges/)
             */
            type: string;
            /**
             * The badge's label.
             */
            label: string;
          };
        }
      | {
          /**
           * When a user gets a new top rank in TETRA LEAGUE. Seen in user streams only.
           */
          rankup: {
            /**
             * The username of the player.
             */
            username: string;
            /**
             * The new rank.
             */
            rank: string;
          };
        }
      | {
          /**
           *  When a user gets TETR.IO Supporter. Seen in user streams only.
           */
          supporter: {
            /**
             * The username of the player.
             */
            username: string;
          };
        }
      | {
          /**
           *  When a user is gifted TETR.IO Supporter. Seen in user streams only.
           */
          supporter_gift: {
            /**
             * The username of the recipient.
             */
            username: string;
          };
        };

    export interface NewsItem {
      /**
       * The item's internal ID.
       */
      _id: string;
      /**
       * The item's stream.
       */
      stream: string;
      /**
       * The item's type.
       */
      type: string;
      /**
       * The item's records.
       */
      data: NewsData;
      /**
       * The item's creation date.
       */
      ts: string;
    }

    export interface AchievementLeaderboardEntry {
      /**
       * The user owning the achievement:
       */
      u: {
        /**
         *  The user's internal ID.
         */
        _id: string;
        /**
         * The user's username.
         */
        username: string;
        /**
         *  The user's role.
         */
        role: string;
        /**
         *  Whether the user is supporting TETR.IO.
         */
        supporter: boolean;
        /**
         *  The user's country, if public.
         */
        country?: string;
      };
      /**
       *  The achieved score in the achievement.
       */
      v: number;
      /**
       *  Additional score for the achievement.
       */
      a?: number;
      /**
       * The time the achievement was last updated.
       */
      t: string;
    }

    export interface AchievementCutoffs {
      /**
       * The total amount of users with this achievement.
       */
      total: number;
      /**
       *  If applicable, the score required to obtain a Diamond rank. (If null, any score is allowed; if not given, this rank is not available.)
       */
      diamond?: number;
      /**
       *  If applicable, the score required to obtain a Platinum rank. (If null, any score is allowed; if not given, this rank is not available.)
       */
      platinum?: number;
      /**
       * If applicable, the score required to obtain a Gold rank. (If null, any score is allowed; if not given, this rank is not available.)
       */
      gold?: number;
      /**
       * If applicable, the score required to obtain a Silver rank. (If null, any score is allowed; if not given, this rank is not available.)
       */
      silver?: number;
      /**
       * If applicable, the score required to obtain a Bronze rank. (If null, any score is allowed; if not given, this rank is not available.)
       */
      bronze?: number;
    }

    export type HasKeys<T> = T extends { [key: string]: any } ? T : never;
  }
}

export { ChannelAPI as CH, ChannelAPI as ch, ChannelAPI as default };
