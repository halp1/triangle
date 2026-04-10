import type { Social } from "../../social";
import type { Client } from "./client";
import { Buffer } from "buffer/index.js";

export interface Ribbon {
  session: {
    ribbonid: string;
    tokenid: string;
  };

  ping: {
    recvid: number;
  };

  "server.authorize": {
    success: boolean;
    maintenance: boolean;
    worker: {
      name: string;
      flag: string;
    };
    social: {
      total_online: number;
      notifications: Social.Notification[];
      presences: {
        [userId: string]: {
          status: string;
          detail: string;
          invitable: boolean;
        };
      };
      relationships: Social.Relationship[];
    };
  };

  "server.migrate": {
    endpoint: string;
    name: string;
    flag: string;
  };

  "server.migrated": Record<string, unknown>;

  "server.announcement": {
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    type: "maintenance" | String;
    msg: string;
    ts: number;
    reason?: string;
  };

  "server.maintenance": Record<string, unknown>;

  kick: {
    reason: string;
  };

  nope: {
    reason: string;
  };

  rejected: void;

  error: any;
  err: any;
  packets: {
    packets: Buffer[];
  };

  notify:
    | {
        type: "err" | "warn" | "ok" | "announce";
        msg: string;
      }
    | {
        type: "deny";
        msg: string;
        timeout?: number;
      }
    | Client["client.notify"]
    | string;
}
