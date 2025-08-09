import { type Codec, type LoggingLevel } from ".";
import type { Game } from "../../types";

export namespace RibbonEvents {
  export type Raw<T> = {
    [P in keyof T]: T[P] extends void
      ? { command: P }
      : { command: P; data: T[P] };
  }[keyof T];

  export interface Send {}
}

export interface RibbonParams {
  token: string;
  userAgent: string;
  handling: Game.Handling;
}

export interface RibbonOptions {
  /**
   * The type of websocket encoder to use. `json`, `candor`, or `teto` is recommended.
   * `json` only works if the JSON protocol is enabled on your account. You must request it to be enabled before use or your account will be banned when Triangle tries to connect.
   * @default "teto"
   */
  codec: Codec;
  /**
   * The target level of Ribbon terminal log output.
   * `none` = no logs
   * `error` = only errors
   * `all` = all logs
   */
  logging: LoggingLevel;
  /**
   * Whether or not connect to a spool (when off, the client will connect directly to tetr.io).
   * It is highly recommended to leave this on.
   * @default true
   */
  spooling: boolean;
  /**
   * @deprecated - use `logging`
   * Enables logging
   * @default false
   */
  verbose: boolean;
}
