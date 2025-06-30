import { type APIDefaults } from ".";
import type { Get, Post } from "./basic";

import chalk from "chalk";

export namespace Server {
  export interface Signature {
    version: string;
    countdown: boolean;
    novault: boolean;
    noceriad: boolean;
    norichpresence: boolean;
    noreplaydispute: boolean;
    supporter_specialthanks_goal: number;
    xp_multiplier: number;
    catalog: {
      supporter: {
        price: number;
        price_bulk: number;
        price_gift: number;
        price_gift_bulk: number;
        bulk_after: number;
        normal_price: number;
        normal_price_bulk: number;
        normal_price_gift: number;
        normal_price_gift_bulk: number;
        normal_bulk_after: number;
      };
      "zenith-tower-ost": {
        price: number;
        normal_price: number;
      };
    };
    league_mm_roundtime_min: number;
    league_mm_roundtime_max: number;
    league_additional_settings: Record<string, any>;
    league_season: {
      current: string;
      prev: string;
      next: string | null;
      next_at: string | null;
      ranked: boolean;
    };
    zenith_duoisfree: boolean;
    zenith_freemod: boolean;
    zenith_cpu_count: number;
    zenith_additional_settings: {
      TEMP_zenith_grace: string;
      messiness_timeout: number;
    };
    domain: string;
    ch_domain: string;
    mode: string;
    sentry_enabled: boolean;
    serverCycle: string;
    domain_hash: string;
    client: {
      commit: {
        id: string;
        time: number;
      };
      branch: string;
      build: {
        id: string;
        time: number;
      };
    };
  }

  export interface Environment {
    stats: {
      players: number;
      users: number;
      gamesplayed: number;
      gametime: number;
    };
    signature: Signature;
    vx: string;
  }
}

export const server = (get: Get, _: Post, options: APIDefaults) => {
  const getDespool = async (endpoint: string, index: string) => {
    const req = await fetch(
      encodeURI(
        `https://${endpoint}/spool?${Date.now()}-${index}-${Math.floor(1e6 * Math.random())}`
      ),
      {
        method: "GET",
        headers: {
          // Authorization: `Bearer ${options.token}`,
          "User-Agent": options.userAgent
        }
      }
    );
    const res = new Uint8Array(await req.arrayBuffer());

    const parseSpoolData = (binary: Uint8Array) => {
      const version = binary[0];
      const flags = {
        online: binary[1] & 0b10000000,
        avoidDueToHighLoad: binary[1] & 0b01000000,
        recentlyRestarted: binary[1] & 0b00100000,
        backhaulDisrupted: binary[1] & 0b00010000,
        unused5: binary[1] & 0b00001000,
        unused6: binary[1] & 0b00000100,
        unused7: binary[1] & 0b00000010,
        unused8: binary[1] & 0b00000001
      } as const;
      const load = [0, 0, 0];
      const latency = binary[5] * 2;

      load[0] = (binary[2] / 0x100) * 4;
      load[1] = (binary[3] / 0x100) * 4;
      load[2] = (binary[4] / 0x100) * 4;

      return {
        version,
        flags,
        load,
        latency,
        str: `v${version} /${flags.avoidDueToHighLoad ? "Av" : ""}${flags.recentlyRestarted ? "Rr" : ""}${flags.backhaulDisrupted ? "Bd" : ""}/ ${load[0]}, ${load[1]}, ${load[2]}`
      };
    };

    return parseSpoolData(res);
  };

  const findFastestAvailableSpool = async (
    spools: { name: string; host: string; flag: string; location: string }[]
  ): Promise<{
    name: string;
    host: string;
    flag: string;
    location: string;
  }> => {
    try {
      return await Promise.any(
        spools.map(async (s, index) => {
          const spool = await getDespool(s.host, index.toString());
          if (spool.flags.avoidDueToHighLoad || spool.flags.recentlyRestarted)
            throw new Error("Spool is unstable");
          return s;
        })
      );
    } catch {
      console.log(
        `${chalk.yellow("[🎀\u2009Ribbon]")}: All spools down or recently restarted (unstable). Falling back to root TETR.IO host.`
      );
    }
    return {
      name: "tetr.io",
      host: "tetr.io",
      flag: "NL",
      location: "osk"
    };
  };

  return {
    environment: async (): Promise<Server.Environment> => {
      const result = await get<Server.Environment>({
        uri: "server/environment"
      });

      if (result.success === false) throw new Error(result.error.msg);
      return result;
    },
    spool: async (useSpools: boolean) => {
      const res = await get<{
        endpoint: string;
        spools: {
          token: string;
          spools: {
            name: string;
            host: string;
            flag: string;
            location: string;
          }[];
        } | null;
      }>({
        uri: "server/ribbon"
      });

      if (res.success === false) {
        throw new Error(res.error.msg);
      }

      if (!useSpools || res.spools === null)
        return {
          host: "tetr.io",
          endpoint: res.endpoint.replace("/ribbon/", ""),
          token: ""
        };
      else {
        const lowestPingSpool = await findFastestAvailableSpool(
          res.spools.spools
        );
        return {
          host: lowestPingSpool.host,
          endpoint: res.endpoint.replace("/ribbon/", ""),
          token: res.spools.token
        };
      }
    }
  };
};
