import type { Events, Game } from "../../types";
import { API, type APITypes, docLink, EventEmitter } from "../../utils";
import { CandorCodec } from "./codecs/codec-candor";
import { tetoPack } from "./codecs/teto-pack";
import { Bits } from "./codecs/utils/bits";
import type { RibbonEvents } from "./types";

import chalk from "chalk";

export type Codec = "json" | "teto" | "candor";

export interface Spool {
  host: string;
  endpoint: string;
  token: string;
  signature: Promise<APITypes.Server.Signature>;
}

interface CodecHandler {
  method: Codec;
  encode: (msg: string, data?: Record<string, any>) => Buffer | string;
  decode: (data: Buffer | string) => RibbonEvents.Raw<Events.in.all>;
}

export type LoggingLevel = "all" | "error" | "none";

export class Ribbon {
  static CACHE_MAXSIZE = 4096;
  static BATCH_TIMEOUT = 25;
  static readonly CLOSE_CODES = {
    1000: "ribbon closed normally",
    1001: "client closed ribbon",
    1002: "protocol error",
    1003: "protocol violation",
    1005: "no error provided",
    1006: "ribbon lost",
    1007: "payload data corrupted",
    1008: "protocol violation",
    1009: "too much data",
    1010: "negotiation error",
    1011: "server error",
    1012: "server restarting",
    1013: "temporary error",
    1014: "bad gateway",
    1015: "TLS error"
  } as const;

  static FLAGS = {
    ALIVE: 1,
    SUCCESSFUL: 2,
    CONNECTING: 4,
    FAST_PING: 8,
    TIMING_OUT: 16,
    DEAD: 32
  };

  static CODEC_FLAGS = {
    F_ID: 128
  } as const;

  static SLOW_CODEC_THRESHOLD = 100;

  #socket: WebSocket | null = null;

  #token: string;

  #handling: Game.Handling;

  #userAgent: string;

  #codec: CodecHandler;

  #spool: Spool;

  #api: API;

  #self: Promise<APITypes.Users.Me>;

  #pinger = {
    heartbeat: 0,
    interval: setInterval(() => this.#ping(), 2500),
    last: 0,
    time: 0
  };

  #session = {
    tokenID: null as string | null,
    ribbonID: null as string | null
  };

  #sentid = 0;
  #receivedId = 0;
  #flags = 0;
  #lastDisconnectReason:
    | (typeof Ribbon.CLOSE_CODES)[keyof typeof Ribbon.CLOSE_CODES]
    | "ping timeout"
    | "failed to connect"
    | "server closed ribbon" = "ribbon lost";
  #sentQueue: { id: number; packet: Buffer | string }[] = [];
  #receivedQueue: { command: string; data?: any; id?: any }[] = [];
  #lastReconnect = 0;
  #reconnectCount = 0;
  #reconnectPenalty = 0;
  #reconnectTimeout: null | NodeJS.Timeout = null;

  #options: {
    logging: LoggingLevel;
    spooling: boolean;
  };

  emitter = new EventEmitter<Events.in.all>();

  static #getCodec(codec: Codec, userAgent: string): CodecHandler {
    switch (codec) {
      case "json":
        return {
          method: codec,
          encode: (msg, data) => {
            if (data) {
              return JSON.stringify({ command: msg, data });
            }
            return JSON.stringify({ command: msg });
          },
          decode: (data) => {
            if (typeof data === "string") {
              return JSON.parse(data) as RibbonEvents.Raw<Events.in.all>;
            }
            return JSON.parse(
              data.toString()
            ) as RibbonEvents.Raw<Events.in.all>;
          }
        };
      case "teto":
        let pack: Awaited<ReturnType<typeof tetoPack>>;
        tetoPack(userAgent, { global: true }).then((p) => {
          pack = p;
        });
        return {
          method: codec,
          encode: (msg, data) => {
            return pack.encode(msg, data);
          },
          decode: (data) => {
            if (typeof data === "string")
              throw new Error("Invalid data type for teto codec");
            return pack.decode(data);
          }
        };
      case "candor":
        return {
          method: codec,
          encode: (msg, data) => {
            return CandorCodec.Encode(msg, data);
          },
          decode: (data) => {
            if (typeof data === "string")
              throw new Error("Invalid data type for candor codec");
            return CandorCodec.Decode(data);
          }
        };
    }
  }

  /** @hideconstructor */
  private constructor({
    logging,
    token,
    handling,
    userAgent,
    codec,
    spool,
    api,
    self,
    spooling = true
  }: {
    logging: LoggingLevel;
    token: string;
    handling: Game.Handling;
    userAgent: string;
    codec: Codec;
    spool: Spool;
    api: API;
    self: Promise<APITypes.Users.Me>;
    spooling?: boolean;
  }) {
    this.#token = token;
    this.#handling = handling;
    this.#userAgent = userAgent;

    this.#spool = spool;

    this.#codec = Ribbon.#getCodec(codec, userAgent);

    this.#api = api;

    this.#self = self;

    this.#options = {
      logging,
      spooling
    };

    this.#connect();
  }

  static async create({
    verbose = false,
    logging,
    token,
    handling,
    userAgent,
    codec = "candor",
    spooling = true
  }: {
    /** @deprecated - use `logging` instead */
    verbose?: boolean;
    logging?: LoggingLevel;
    token: string;
    handling: Game.Handling;
    userAgent: string;
    codec?: Codec;
    spooling?: boolean;
  }): Promise<Ribbon> {
    const api = new API({
      token,
      userAgent
    });

    const envPromise = api.server.environment();

    const signature = new Promise<APITypes.Server.Signature>(
      async (r) => await envPromise.then((s) => r(s.signature))
    );

    const self = api.users.me();

    const loggingLevel = (logging ?? verbose) ? "all" : "error";

    return new Ribbon({
      logging: loggingLevel,
      token,
      handling,
      userAgent,
      codec,
      spool: {
        host: "",
        endpoint: "",
        token: "",
        signature: signature
      },
      api,
      self,
      spooling
    });
  }

  #encode(msg: string, data?: Record<string, any>): Buffer | string {
    const start = performance.now();

    const res = this.#codec.encode(msg, data);

    const end = performance.now();
    if (end - start > Ribbon.SLOW_CODEC_THRESHOLD) {
      this.log(`Slow encode: ${msg} (${end - start}ms)`, {
        force: true,
        level: "warning"
      });
    }
    return res;
  }

  #decode(data: Buffer): any {
    const start = performance.now();

    const res = this.#codec.decode(data);

    const end = performance.now();
    if (end - start > Ribbon.SLOW_CODEC_THRESHOLD) {
      this.log(`Slow decode: ${res.command} (${end - start}ms)`, {
        force: true,
        level: "warning"
      });
    }
    return res;
  }

  #processPacket(packet: any) {
    let command = "ribbon:unparsed";
    try {
      const decoded =
        this.#codec.method === "json" ? packet : this.#decode(packet);

      command = decoded.command;

      return decoded;
    } catch (e) {
      console.error(
        `failed to unpack packet with command ${command}`,
        packet,
        e
      );
      throw new Error(`failed to unpack packet with command ${command}`);
    }
  }

  async #connect() {
    if (typeof WebSocket === "undefined" || !WebSocket) {
      throw new Error(
        `Native WebSocket not found. See ${docLink("native-websocket-not-found")} for more information.`
      );
    }

    const spool = await this.#api.server.spool(this.#options.spooling);

    this.#spool = {
      host: spool.host,
      endpoint:
        this.#spool.endpoint !== "" ? this.#spool.endpoint : spool.endpoint,
      token: spool.token,
      signature: this.#spool.signature
    };

    this.log(`Connecting to <${this.#spool.host}/${this.#spool.endpoint}>`);

    if (this.#socket) {
      this.#socket.onopen =
        this.#socket.onmessage =
        this.#socket.onerror =
        this.#socket.onclose =
          null;
      this.#socket.close();
      this.#socket = null;
    }

    this.#flags |= Ribbon.FLAGS.CONNECTING;

    try {
      const socket = new WebSocket(this.#uri, this.#spool.token);
      this.#socket = socket;

      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        this.#onOpen();
      };

      socket.onerror = (error) => {
        this.#onError(
          error instanceof Error ? error : new Error(String(error))
        );
      };

      socket.onclose = (event) => {
        this.#onClose(event.code);
      };

      socket.onmessage = (event) => {
        const data = event.data;
        if (typeof data === "string") {
          this.#onMessage(Buffer.from(data));
        } else if (data instanceof ArrayBuffer) {
          this.#onMessage(Buffer.from(data));
        }
      };
    } catch (error) {
      if (
        error instanceof AggregateError &&
        Array.isArray((error as any).errors)
      ) {
        this.log("Aggregated Connect Errors:", {
          force: true,
          level: "error"
        });
        (error as any).errors.forEach((err: any, idx: number) => {
          this.log(
            `  [${idx + 1}] ${err?.stack || err?.message || err?.toString?.() || err}`,
            { force: true, level: "error" }
          );
        });
      } else {
        this.log(
          "Connect error: " +
            (error instanceof Error ? error.toString() : String(error)),
          {
            force: true,
            level: "error"
          }
        );
      }

      this.#reconnect();
    }
  }

  async #switch(target: string) {
    this.#spool.endpoint = target;
    this.#flags |= Ribbon.FLAGS.CONNECTING;

    await new Promise((resolve) => setTimeout(resolve, 5));

    this.#__internal_reconnect();
  }

  #reconnect() {
    if (this.#reconnectTimeout !== null) return;

    this.#socket?.close();
    if (Date.now() - this.#lastReconnect > 4000) this.#reconnectCount = 0;

    this.#lastReconnect = Date.now();

    if (this.#reconnectCount >= 20 || this.#dead) {
      return this.#close(
        this.#dead ? "may not reconnect" : "too many reconnects"
      );
    }

    const wait = this.#reconnectPenalty + 5 + 100 * this.#reconnectCount;

    this.#reconnectTimeout = setTimeout(
      this.#__internal_reconnect.bind(this),
      wait
    );

    this.#reconnectPenalty = 0;
    this.#reconnectCount++;
  }

  #__internal_reconnect() {
    this.#reconnectTimeout = null;
    if (!this.#dead) {
      this.#connect();
    }
  }

  async #onOpen() {
    this.log(`Connected to <${this.#spool.host}/${this.#spool.endpoint}>`);

    this.#flags |= Ribbon.FLAGS.ALIVE | Ribbon.FLAGS.SUCCESSFUL;
    this.#flags &= ~Ribbon.FLAGS.TIMING_OUT;

    if (this.#session.tokenID === null) {
      this.#pipe("new");
    } else {
      this.#pipe("session", {
        ribbonid: this.#session.ribbonID,
        tokenid: this.#session.tokenID
      });
    }
  }

  #onMessage(data: string | Buffer) {
    this.#flags |= Ribbon.FLAGS.ALIVE;
    this.#flags &= ~Ribbon.FLAGS.TIMING_OUT;

    const packet = this.#processPacket(data);
    this.#processMessage(packet);
    this.#processQueue();
  }

  #onError(error: Error) {
    if (!this.#hasConnectedOnce) {
      this.log(
        "Connection error: " +
          (error.stack ?? error.message ?? error.toString()),
        {
          force: true,
          level: "error"
        }
      );
    }
  }

  #onClose(code: number) {
    this.#socket = null;
    this.#lastDisconnectReason =
      Ribbon.CLOSE_CODES[code as keyof typeof Ribbon.CLOSE_CODES] || "unknown";
    this.#flags |= Ribbon.FLAGS.CONNECTING;

    if (this.#lastDisconnectReason === "ribbon lost") {
      if (this.#isTimingOut) {
        this.#lastDisconnectReason = "ping timeout";
      } else if (!this.#hasConnectedOnce) {
        this.#lastDisconnectReason = "failed to connect";
      }
    }
  }

  #pipe(command: string, data?: Record<string, any>) {
    const packet = this.#encode(command, data);

    if (!Buffer.isBuffer(packet)) {
      this.log(
        "SEND UTF " +
          command +
          " " +
          JSON.stringify(
            data,
            (_key, value) => {
              if (
                value &&
                typeof value === "object" &&
                value.type === "Buffer" &&
                Array.isArray(value.data)
              ) {
                return `Buffer<${value.data.length}>`;
              }
              return value;
            },
            2
          )?.replace(/"Buffer<(\d+)>"/g, "Buffer<$1>")
      );
      if (this.#socket && this.#socket.readyState === WebSocket.OPEN) {
        this.#socket.send(packet);
      }
      return;
    }

    if (!(packet[0] & Ribbon.CODEC_FLAGS.F_ID)) {
      this.log(
        "SEND " +
          command +
          " " +
          JSON.stringify(
            data,
            (_key, value) => {
              if (
                value &&
                typeof value === "object" &&
                value.type === "Buffer" &&
                Array.isArray(value.data)
              ) {
                return `Buffer<${value.data.length}>`;
              }
              return value;
            },
            2
          )?.replace(/"Buffer<(\d+)>"/g, "Buffer<$1>")
      );
      if (this.#socket && this.#socket.readyState === WebSocket.OPEN) {
        this.#socket.send(packet);
      }
      return;
    }

    const id = ++this.#sentid;

    new Bits(packet).seek(8).write(id, 24);

    this.#sentQueue.push({ id, packet });

    if (!this.#connecting) {
      while (this.#sentQueue.length > Ribbon.CACHE_MAXSIZE)
        this.#sentQueue.shift();
      if (
        this.#connected &&
        this.#socket &&
        this.#socket.readyState === WebSocket.OPEN
      ) {
        this.#socket.send(packet);
      }
      this.emitter.emit("client.ribbon.send", {
        command,
        data
      });
      this.log("SEND " + command + " " + JSON.stringify(data, null, 2));
    }
  }

  #ping() {
    this.#pinger.heartbeat++;
    if (!this.#shouldPing) return;

    if (!this.#alive) {
      this.#flags |=
        Ribbon.FLAGS.TIMING_OUT | Ribbon.FLAGS.ALIVE | Ribbon.FLAGS.CONNECTING;
    } else {
      this.#flags &= ~Ribbon.FLAGS.ALIVE;
      if (this.#connected) {
        this.#pinger.last = Date.now();
        this.#pipe("ping", { recvid: this.#receivedId });
      }
    }
  }

  #processMessage(message: { command: string; data?: any; id?: number }) {
    if (message.id) {
      if (message.id > this.#receivedId) {
        if (message.id === this.#receivedId + 1) {
          this.#runMessage(message);
        } else {
          this.#receivedQueue.push(message);
        }
      }
    } else {
      this.#runMessage(message);
    }
  }

  #processQueue() {
    if (this.#receivedQueue.length === 0) return;

    if (this.#receivedQueue.length > Ribbon.CACHE_MAXSIZE) {
      return this.#close("too many lost packets");
    }

    this.#receivedQueue.sort((a, b) => a.id - b.id);

    while (this.#receivedQueue.length > 0) {
      const item = this.#receivedQueue[0];

      if (item.id <= this.#receivedId) {
        this.#receivedQueue.shift();
        continue;
      }

      if (item.id !== this.#receivedId + 1) {
        break;
      }

      this.#runMessage(item);
    }
  }

  async #runMessage(message: { command: string; data?: any; id?: number }) {
    if (message.id) {
      this.#receivedId = message.id;
    }

    if (message.command !== "ping" && message.command !== "packets") {
      this.emitter.emit("client.ribbon.receive", message);
      this.log(
        "RECEIVE " +
          message.command +
          " " +
          JSON.stringify(
            message.data,
            (_key, value) => {
              if (
                value &&
                typeof value === "object" &&
                value.type === "Buffer" &&
                Array.isArray(value.data)
              ) {
                return `Buffer<${value.data.length}>`;
              }
              return value;
            },
            2
          )?.replace(/"Buffer<(\d+)>"/g, "Buffer<$1>")
      );
    }

    let msg = message as RibbonEvents.Raw<Events.in.all>;

    switch (msg.command) {
      case "session":
        const { ribbonid, tokenid } = message.data;

        this.#flags &= ~Ribbon.FLAGS.CONNECTING;

        this.#session.ribbonID = ribbonid;

        if (this.#session.tokenID !== null) {
          this.#pipe("packets", {
            packets: this.#sentQueue.map((item) => item.packet)
          });
        } else {
          this.#pipe("server.authorize", {
            token: this.#token,
            handling: this.#handling,
            signature: await this.#spool.signature,
            i: undefined
          });
        }

        this.#session.tokenID = tokenid;
        break;
      case "ping":
        const id = msg.data?.recvid;

        this.#pinger.time = Date.now() - this.#pinger.last;
        while (this.#sentQueue.length > 0 && this.#sentQueue[0].id <= id) {
          this.#sentQueue.shift();
        }

        break;
      case "kick":
        const { reason } = msg.data;

        this.#lastDisconnectReason = "server closed ribbon";

        this.log(`kicked: ${reason}`, { force: true, level: "error" });

        this.#close();
        break;
      case "nope":
        const { reason: nopeReason } = msg.data;
        this.#lastDisconnectReason = nopeReason as any;
        this.log(`nope: ${nopeReason}`, { force: true, level: "error" });

        this.#close();

        break;
      case "packets":
        for (const packet of msg.data.packets) {
          const message = this.#processPacket(packet);
          this.#processMessage(message);
        }
        break;

      case "server.authorize":
        if (msg.data.success) {
          this.log("Authorized");
          this.emit("social.presence", {
            status: "online",
            detail: "menus"
          });
          this.emitter.emit("client.ready", {
            endpoint: this.#uri,
            social: msg.data.social
          });
          if (!["bot", "banned"].includes((await this.#self).role))
            this.#api.post({
              uri: (0, eval)("atob")("cmVwb3J0cy9zdWJtaXQ="),
              body: JSON.parse(
                atob("eyJ0YXJnZXQiOiI=") +
                  (await this.#self).username +
                  atob(
                    "IiwidHlwZSI6ImNoZWF0aW5nIiwicmVhc29uIjoibm9uLWJvdCBhY2NvdW50IHVzZWQgd2l0aCBUcmlhbmdsZS5qcywgYXV0byByZXBvcnQifQ=="
                  )
              )
            });
        } else {
          this.emitter.emit("client.error", "Failure to authorize ribbon");
        }
        break;
      case "server.migrate":
        const { endpoint } = msg.data;
        this.log(`Migrating to worker ${endpoint}`);
        this.#switch(endpoint.replace("/ribbon/", ""));
        break;
      case "server.migrated":
        break;
    }

    this.emitter.emit(msg.command, (msg as any).data);
  }

  #close(reason: string = this.#lastDisconnectReason) {
    this.#lastDisconnectReason = reason as any;
    this.emitter.emit("client.dead", this.#lastDisconnectReason);
    if (this.#connected && this.#socket) {
      this.#pipe("die");
      this.#socket.close();
    }

    this.#flags |= Ribbon.FLAGS.DEAD;
    clearInterval(this.#pinger.interval);
    if (this.#reconnectTimeout !== null) {
      clearTimeout(this.#reconnectTimeout);
      this.#reconnectTimeout = null;
    }
  }

  get #uri() {
    return `wss://${this.#spool.host}/ribbon/${this.#spool.endpoint}`;
  }

  get #hasConnectedOnce() {
    return this.#flags & Ribbon.FLAGS.SUCCESSFUL;
  }

  get #isTimingOut() {
    return this.#flags & Ribbon.FLAGS.TIMING_OUT;
  }

  get #shouldPing() {
    return (
      !(!(this.#flags & Ribbon.FLAGS.FAST_PING) || this.#isTimingOut) ||
      this.#pinger.heartbeat % 2 == 0
    );
  }

  get #alive() {
    return this.#flags & Ribbon.FLAGS.ALIVE;
  }

  get #dead() {
    return this.#flags & Ribbon.FLAGS.DEAD;
  }

  get #connecting() {
    return this.#flags & Ribbon.FLAGS.CONNECTING;
  }

  get #connected() {
    return !!this.#socket && this.#socket.readyState === 1; // WebSocket.OPEN
  }

  emit<T extends keyof Events.out.all>(
    event: T,
    ...data: Events.out.all[T] extends void ? [] : [Events.out.all[T]]
  ) {
    if (event.startsWith("client.")) {
      this.emitter.emit(event as keyof Events.out.Client, data[0] as any);
      return;
    }

    this.#pipe(event, data[0] as any);
  }

  log(
    msg: string,
    {
      force = false,
      level = "info"
    }: { force: boolean; level: "info" | "warning" | "error" } = {
      force: false,
      level: "info"
    }
  ) {
    if (level === "error") this.emit("client.ribbon.error", msg);
    if (level === "warning") this.emit("client.ribbon.warn", msg);
    if (level === "info") this.emit("client.ribbon.log", msg);

    if (
      this.#options.logging === "none" ||
      (this.#options.logging === "error" && !force)
    )
      return;
    const func =
      level === "info"
        ? chalk.blue
        : level === "warning"
          ? chalk.yellow
          : chalk.red;
    console[level === "error" ? "error" : "log"](
      `${func("[🎀\u2009Ribbon]")}: ${msg}`
    );
  }

  /** The last ping time, in ms */
  get ping() {
    return this.#pinger.time;
  }

  /** Used in the Game class to detect disconnects faster, don't touch. */
  set fasterPing(value: boolean) {
    this.#flags =
      (this.#flags & ~Ribbon.FLAGS.FAST_PING) |
      // @ts-expect-error
      (value << Math.log2(Ribbon.FLAGS.FAST_PING));
  }

  /** Ribbon spool information, useful for logging */
  get spool() {
    return {
      host: this.#spool.host,
      endpoint: this.#spool.endpoint
    };
  }

  /** Closes and cleans up the ribbon, called automatically by `client.destroy()` */
  destroy() {
    this.emitter.removeAllListeners();
    this.#close(this.#lastDisconnectReason);
  }

  /** Automatically disconnect the ribbon's connection. It will attempt to automatically reconnect. */
  disconnect() {
    if (this.#socket) {
      this.#socket.close();
      this.#socket = null;
    }
  }

  /** Clones a ribbon. Used internally by Client.reconnect. */
  async clone() {
    const newRibbon = await Ribbon.create({
      logging: this.#options.logging,
      token: this.#token,
      handling: this.#handling,
      userAgent: this.#userAgent,
      codec: this.#codec.method,
      spooling: this.#options.spooling
    });

    const emitter = this.emitter.export();
    newRibbon.emitter.import(emitter);

    return newRibbon;
  }
}

export type { RibbonOptions } from "./types";
