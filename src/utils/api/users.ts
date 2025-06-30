import type { APIDefaults } from ".";
import type { User as UserTypes } from "../../types";
import type { Get, Post } from "./basic";

export namespace Users {
  /** Data returned from /api/users/me */
  export interface Me {
    _id: string;
    username: string;
    country: string | null;
    email?: string | undefined;
    role: UserTypes.Role;
    ts: Date;
    badges: UserTypes.Badge[];
    xp: number;
    privacy_showwon: boolean;
    privacy_showplayed: boolean;
    privacy_showgametime: boolean;
    privacy_showcountry: boolean;
    privacy_privatemode: string;
    privacy_status_shallow: string;
    privacy_status_deep: string;
    privacy_status_exact: string;
    privacy_dm: string;
    privacy_invite: string;
    thanked: boolean;
    banlist: any[]; // You may want to define a type for this array's contents
    warnings: any[]; // You may want to define a type for this array's contents
    bannedstatus: string;
    records?: UserTypes.Records; // You may want to define a type for this
    supporter: boolean;
    supporter_expires: number;
    total_supported: number;
    league: UserTypes.League;
    avatar_revision?: number;
    banner_revision?: number;
    bio?: string;
    zen?: any; // TODO: type
    distinguishment?: any;
    totp: {
      enabled?: boolean;
      codes_remaining: number;
    };
    connections: {
      [key: string]: any; // You may want to define a type for the values
    };
  }

  export interface User {
    _id: string;
    username: string;
    role: string;
    ts: string;
    badges: UserTypes.Badge[];
    xp: number;
    gamesplayed: number;
    gameswon: number;
    gametime: number;
    country: string;
    badstanding: boolean;
    records: UserTypes.Records;
    supporter: boolean;
    supporter_tier: number;
    verified: boolean;
    league: UserTypes.League;
    avatar_revision: number;
    banner_revision: number;
    bio: string;
    friendCount: number;
    friendedYou: boolean;
  }
}

export const users = (get: Get, post: Post, __: APIDefaults) => {
  /** Checks whethere a user exists */
  const exists = async (username: string): Promise<boolean> => {
    const res = await get<{ exists: boolean }>({
      token: undefined,
      uri: `users/${username}/exists`
    });
    if (res.success === false) throw new Error(res.error.msg);
    return res.exists;
  };

  /** Resolves a username to a user ID */
  const resolve = async (username: string) => {
    const res = await get<{ _id: string }>({
      token: undefined,
      uri: `users/${encodeURIComponent(username.trim())}/resolve`
    });
    if (res.success === false) throw new Error(res.error.msg + ": " + username);
    return res._id;
  };

  return {
    /**	Checks whether a user exists */
    exists,
    authenticate: async (
      username: string,
      password: string
    ): Promise<{ token: string; id: string }> => {
      const res = await post<{ token: string; userid: string }>({
        token: undefined,
        uri: "users/authenticate",
        body: {
          username,
          password,
          totp: ""
        }
      });

      if (res.success === false) throw new Error(res.error.msg);
      return {
        token: res.token,
        id: res.userid
      };
    },
    me: async (): Promise<Users.Me> => {
      const res = await get<{ user: Users.Me }>({ uri: "users/me" });

      if (res.success === false)
        throw new Error("Failure loading profile: " + res.error.msg);
      return res.user;
    },
    resolve,

    /** Get a user's profile */
    get: async (options: { username: string } | { id: string }) => {
      const res = await get<{ user: Users.User }>({
        uri:
          "users/" +
          ("username" in options ? await resolve(options.username) : options.id)
      });

      if (res.success === false)
        throw new Error("Failure loading profile: " + res.error.msg);
      return res.user;
    }
  };
};
