import type { User as UserTypes } from "../../types";

import type { APIDefaults } from ".";
import type { Get, Post } from "./core";

export namespace Users {
  /** A single entry of a user's `banlist`. */
  export interface Ban {
    id: string;
    /** Present on newer bans; displayed to the user in place of `id`. */
    shortid?: string;
    /** What was banned - your account, or the IP you connected from. */
    from: "account" | "ip" | (string & {});
    type: "silence" | "restrict" | "block" | (string & {});
    /** When the ban was issued (date string) */
    ts: string;
    reason: string;
    /** When the ban expires (date string). TETR.IO represents permanent bans as an absurdly distant date. */
    expires: string;
    /** The chat messages that led to the ban, if the ban was issued over chat. */
    context?: { chat?: string[] };
  }

  /**
   * `ok` if the user is in good standing. `silence`d users may not chat or create public rooms;
   * `restrict`ed users may not play online or submit scores.
   */
  export type BannedStatus = "ok" | "silence" | "restrict" | (string & {});

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
    banlist: Ban[];
    warnings: any[]; // You may want to define a type for this array's contents
    bannedstatus: BannedStatus;
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

const BAR = "=".repeat(60);

/** TETR.IO represents a permanent ban as an expiry absurdly far in the future. */
const isPermanent = (ban: Users.Ban) => {
  const expires = Date.parse(ban.expires);
  if (Number.isNaN(expires)) return false;
  const issued = Date.parse(ban.ts);
  return expires - (Number.isNaN(issued) ? Date.now() : issued) >= 54e12;
};

const describeBan = (ban: Users.Ban, index: number) => {
  const verb =
    ban.type === "silence"
      ? "silenced"
      : ban.type === "restrict"
        ? "restricted"
        : "blocked";

  const chat = ban.context?.chat?.length
    ? `\ncontext:\n${ban.context.chat.map((line) => `  > ${line}`).join("\n")}`
    : "";

  return [
    `#${index}: ban id ${ban.shortid ? `BAN!${ban.shortid}` : ban.id}`,
    `your ${ban.from} was ${verb} at ${ban.ts} for the following reason:`,
    `${ban.reason}${chat}`,
    `this ban ${isPermanent(ban) ? "will not expire" : `expires at ${ban.expires}`}.`
  ].join("\n");
};

/** Renders a banlist into the loud, multi-line block TETR.IO shows its own users. */
export const formatBans = (
  header: string,
  summary: string,
  banlist: Users.Ban[]
) =>
  [
    "",
    BAR,
    header,
    summary,
    "",
    banlist.length
      ? banlist.map((ban, i) => describeBan(ban, i + 1)).join("\n\n")
      : "(the server did not say which bans apply)",
    BAR
  ].join("\n");

/** The console block for a logged-in user who is silenced or restricted, or `null` if they are in good standing. */
export const banStatusMessage = (me: Users.Me) => {
  if (me.bannedstatus === "ok") return null;

  return me.bannedstatus === "silence"
    ? formatBans(
        "YOU HAVE BEEN SILENCED",
        "Silenced users may not chat or create public rooms, but can still submit scores and play online.",
        me.banlist ?? []
      )
    : formatBans(
        "YOU HAVE BEEN RESTRICTED",
        "Restricted users may not play online or submit scores.",
        me.banlist ?? []
      );
};

export const users = (get: Get, post: Post, __: APIDefaults) => {
  /** Checks whethere a user exists */
  const exists = async (username: string): Promise<boolean> => {
    const res = await get<{ exists: boolean }>({
      uri: `users/${username}/exists`
    });
    if (res.success === false) throw new Error(res.error.msg);
    return res.exists;
  };

  /** Resolves a username to a user ID */
  const resolve = async (username: string) => {
    const res = await get<{ _id: string }>({
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
        token: null,
        uri: "users/authenticate",
        body: {
          username,
          password,
          totp: ""
        }
      });

      if (res.success === false) {
        if (res.error.msg === "BLOCK")
          throw new Error(
            formatBans(
              res.error.infinite
                ? "YOU HAVE BEEN BANNED FROM TETR.IO"
                : "YOU HAVE BEEN BLOCKED",
              "Blocked users or IPs may not use TETR.IO.",
              res.error.banlist ?? []
            )
          );

        throw new Error(res.error.msg);
      }
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
