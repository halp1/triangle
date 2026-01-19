import type { Game, User, Social } from "../../types";
import type { APIDefaults } from "../../utils";
import type { GameSnapshot, SpectatingStrategy } from "../game";
import type { RibbonOptions } from "../ribbon";
import type { RibbonSnapshot } from "../ribbon/types";
import type { SocialSnapshot } from "../social/types";

export interface GameOptions {
  /**
   * The client's spectating strategy.
   * @default "instant"
   * @see SpectatingStrategy
   */
  spectatingStrategy: SpectatingStrategy;
  /** The client's handling settings.
   * @default { arr: 0, cancel: false, das: 5, dcd: 0, safelock: false, may20g: true, sdf: 41, irs: "tap", ihs: "tap" }
   */
  handling: Game.Handling;
}

export type ClientOptions = (
  | {
      /** The account's JWT authentication token (you can get this from the browser cookies when logging in on https://tetr.io) */
      token: string;
    }
  | {
      /** The account's username */
      username: string;
      /** The accont's password */
      password: string;
    }
) & {
  game?: Partial<GameOptions>;
  /** The client's user agent.
   * @default "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0"
   */
  userAgent?: string;
  /** a cf_clearance Cloudflare turnstile token. */
  turnstile?: string;
  /** The Ribbon (websocket handler) config */
  ribbon?: Partial<RibbonOptions>;
  /** The `Social` config */
  social?: Partial<Social.Config>;
};

export interface ClientUser {
  id: string;
  username: string;
  role: User.Role;
  sessionID: string;
  userAgent: string;
}

export interface ClientSnapshot {
  user: ClientUser;
  token: string;
  handling: Game.Handling;
  ribbon: RibbonSnapshot;
  social: SocialSnapshot;
  // room: RoomSnapshot;
  game: GameSnapshot;
  api: APIDefaults;
}
