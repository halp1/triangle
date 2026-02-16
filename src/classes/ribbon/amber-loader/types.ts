import type { Events } from "../../../types";
import type { RibbonEvents } from "../types";
import type { Buffer } from "buffer/index.js";

export interface Codec {
  _commands: Map<
    string,
    {
      code: number;
      flags: number;

      name?: string;
      buffer?: Buffer;

      encode(
        data: any,
        pack: ((value: any) => Uint8Array) | null,
        name: string
      ): Uint8Array;

      decode(buf: Uint8Array, unpack: ((buf: Uint8Array) => any) | null): any;

      table?: Record<string, number>;

      _kv?: Map<string, number>;
      _vk?: Map<number, string>;

      getkv?: (key: string) => number | undefined;
      getvk?: (value: number) => string | undefined;
    }
  >;

  _codes: Map<
    number,
    {
      code: number;
      flags: number;
      name?: string;
      buffer?: Buffer;
      encode(
        data: any,
        pack: ((value: any) => Uint8Array) | null,
        name: string
      ): Uint8Array;
      decode(buf: Uint8Array, unpack: ((buf: Uint8Array) => any) | null): any;
    }
  >;

  _PACK: ((value: any) => Uint8Array) | null;
  _UNPACK: ((buf: Uint8Array) => any) | null;

  SymCmd: symbol;

  FLAG: {
    F_ALLOC: number;
    F_HOOK: number;
    F_ID: number;
  };

  SetMsgpackr(
    packer: { pack: (value: any) => Uint8Array },
    unpacker: { unpack: (buf: Uint8Array) => any }
  ): void;

  GetHandlers(): string[];

  Add(
    name: string,
    spec: {
      code: number;
      flags: number;
      name?: string;
      buffer?: Buffer;
      encode(
        data: any,
        pack: ((value: any) => Uint8Array) | null,
        name: string
      ): Uint8Array;
      decode(buf: Uint8Array, unpack: ((buf: Uint8Array) => any) | null): any;
      table?: Record<string, number>;
      _kv?: Map<string, number>;
      _vk?: Map<number, string>;
      getkv?: (key: string) => number | undefined;
      getvk?: (value: number) => string | undefined;
    }
  ): void;

  Encode(
    command: string,
    data: any,
    opts?: {
      batched?: boolean;
      id?: number;
    }
  ): Buffer;

  Decode(buf: Buffer): RibbonEvents.Raw<Events.in.all> & { id?: number };
}
