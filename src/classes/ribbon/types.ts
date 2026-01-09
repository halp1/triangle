import { Ribbon, type LoggingLevel, type Spool, type Transport } from ".";
import type { Game } from "../../types";
import type { APIDefaults, APITypes } from "../../utils";
import { Buffer } from "buffer/index.js";

export namespace RibbonEvents {
  export type Raw<T> = {
    [P in keyof T]: T[P] extends void
      ? { command: P }
      : { command: P; data: T[P] };
  }[keyof T];
}

export interface RibbonParams {
  token: string;
  userAgent: string;
  handling: Game.Handling;
}

export interface RibbonOptions {
  /**
   * The type of websocket transport to use. `binary` is recommended and significantly faster.
   * @default "binary"
   */
  transport: Transport;
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

export interface RibbonSnapshot {
  token: string;
  handling: Game.Handling;
  userAgent: string;
  transport: Transport;
  spool: Spool;
  api: APIDefaults;
  self: APITypes.Users.Me;

  pinger: {
    heartbeat: number;
    interval: NodeJS.Timeout;
    last: number;
    time: number;
  };

  session: {
    tokenID: string | null;
    ribbonID: string | null;
  };

  sentID: number;
  receivedID: number;
  flags: number;
  lastDisconnectReason: Ribbon["lastDisconnectReason"];
  sentQueue: { id: number; packet: Buffer | string }[];
  receivedQueue: { command: string; data?: any; id?: any }[];
  lastReconnect: number;
  reconnectCount: number;
  reconnectPenalty: number;

  options: {
    logging: LoggingLevel;
    spooling: boolean;
  };

  emitter: {
    maxListeners: number;
    verbose: boolean;
  };
}
