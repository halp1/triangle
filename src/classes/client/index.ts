import type { Types } from "../..";
import type { Events, Game as GameTypes } from "../../types";
import { API, CONSTANTS, Logger, parseToken } from "../../utils";
import { Game, type SpectatingStrategy } from "../game";
import { Ribbon } from "../ribbon";
import { Room } from "../room";
import { Social } from "../social";
import type { ClientOptions, ClientUser, GameOptions, Warning } from "./types";

export type * from "./types";

export class Client {
  static #eventWarnings: {
    event: keyof Events.in.all;
    warning: string;
  }[] = [
    {
      event: "social.dm",
      warning:
        'This can cause unexpected or erroneous behavior. Instead, use the "client.dm" event. If you really know what you are doing and want to use the "social.dm" event, use the identical "unsafe__social.dm" event.'
    }
  ];

  #eventWarningOverrides = new Map<
    keyof Events.in.all,
    ((data: any) => any)[]
  >();

  #logger = new Logger("Triangle.js");

  /** User information */
  user: ClientUser;
  /** Whether the client has been disconnected. If true, the client needs to be reconnected with `.reconnect()` or destroyed */
  disconnected: boolean = false;
  /** The client's token */
  token: string;
  /** The warnings that the client will suppress */
  suppressWarnings?: Warning[];

  /** @hidden */
  #handling: GameTypes.Handling;
  #spectatingStrategy!: SpectatingStrategy;

  /** Raw ribbon client, the backbone of TETR.IO multiplayer. You probably don't want to touch this unless you know what you are doing. */
  ribbon: Ribbon;
  /** A helpful manager for all things social on TETR.IO (friends, dms etc.) */
  social!: Social;
  /** The room the client is in (if it is in a room). You can make it non-nullable with `client.room!` */
  room?: Room;
  /** The game the client is currently in if it is in a game. */
  game?: Game;

  /** Useful for connecting to the main game API when none of the client helpers have the request you want to send. You can use `client.api.get` and `client.api.post` to easily send GET and POST requests. */
  api: API;

  rooms: {
    list(): ReturnType<API["rooms"]["list"]>;
    join(id: string): Promise<Room>;
    create(type?: "public" | "private"): Promise<Room>;
  };

  /** @hideconstructor */
  private constructor(
    token: string,
    sessionID: string,
    ribbon: Ribbon,
    me: Awaited<ReturnType<API["users"]["me"]>>,
    userAgent: string = CONSTANTS.userAgent,
    gameOptions: GameOptions,
    suppressWarnings?: Warning[]
  ) {
    this.token = token;
    this.ribbon = ribbon;
    this.suppressWarnings = suppressWarnings;

    this.user = {
      id: me._id,
      role: me.role,
      sessionID,
      username: me.username,
      userAgent
    };

    this.#handling = gameOptions.handling;
    this.#spectatingStrategy = gameOptions.spectatingStrategy;

    this.api = new API({ token: this.token, userAgent });

    this.rooms = {
      list: () => this.api.rooms.list(),
      join: async (id: string) => {
        return await this.wrap(
          "room.join",
          id.toUpperCase(),
          "client.room.join"
        );
      },
      create: async (type = "private") => {
        return await this.wrap(
          "room.create",
          type === "public",
          "client.room.join"
        );
      }
    };

    this.#init();
  }

  /**
   * Create a new client
   * @example
   * const client = await Client.create({ token: 'your.jwt.token' });
   * @example
   * const client = await Client.create({ username: 'halp', password: 'password' });
   * @example
   * // If playing games, pass in handling
   * const client = await Client.create({
   *   // ...login info
   *   handling: {
   *     arr: 0,
   *     cancel: false,
   *     das: 5,
   *     dcd: 0,
   *     safelock: false,
   *     may20g: true,
   *     sdf: 41
   *   };
   * });
   * @example
   * // You can pass in a custom user agent
   * const client = await Client.create({
   *   // ...login info
   *   userAgent: "v8/001"
   * });
   */
  static async create(options: ClientOptions) {
    const api = new API();
    if (options.userAgent) {
      api.update({ userAgent: options.userAgent });
    }
    if (options.turnstile) {
      api.update({ turnstile: options.turnstile });
    }

    const sessionID = `SESS-${Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    )}`;
    let self: { id: string; token: string };
    if ("token" in options) {
      if (!options.token) throw new Error("No valid token was provided");
      self = {
        token: options.token,
        id: parseToken(options.token)
      };
    } else if ("username" in options) {
      self = await api.users.authenticate(
        options.username.toLowerCase(),
        options.password
      );
    } else {
      throw new Error("Invalid client options");
    }

    const token = self.token;

    api.update({ token });
    const me = api.users.me();

    const handling: Types.Game.Handling = options.game?.handling || {
      arr: 0,
      cancel: false,
      das: 5,
      dcd: 0,
      safelock: false,
      may20g: true,
      sdf: 41,
      irs: "tap",
      ihs: "tap"
    };

    const ribbon = await Ribbon.create({
      token,
      handling,
      userAgent: options.userAgent || CONSTANTS.userAgent,
      ...(options.ribbon ?? {})
    });

    const data = await new Promise<Events.in.Client["client.ready"]>(
      (resolve, reject) => {
        const t = setTimeout(() => {
          ribbon.destroy();
          reject("Failed to connect: Connection timeout");
        }, 5000);
        ribbon.emitter.once("client.ready", (d) => {
          if (d) {
            clearTimeout(t);
            resolve(d);
          }
        });
        ribbon.emitter.once("client.fail", (e) => {
          clearTimeout(t);
          reject(
            "Failed to connect: " +
              (e.stack ?? e.message)?.replace("Error: ", "")
          );
        });

        ribbon.open();
      }
    );

    const client = new Client(
      token,
      sessionID,
      ribbon,
      await me,
      options.userAgent || CONSTANTS.userAgent,
      { handling, spectatingStrategy: "instant", ...options.game }
    );

    client.social = await Social.create(
      client,
      options.social || {},
      data.social
    );

    client.#eventWarningOverrides.set("social.dm", [client.social._dmListener]);

    return client;
  }

  /**
   * Raw ribbon handler.
   * @example
   * client.on('client.dm', () => console.log('DM received!'));
   */
  on<K extends keyof Events.in.all>(
    event: K,
    cb: (data: Events.in.all[K]) => void
  ): this {
    if (
      Client.#eventWarnings.some((w) => w.event === event) &&
      !this.#eventWarningOverrides.get(event)?.includes(cb)
    ) {
      const warning = Client.#eventWarnings.find(
        (w) => w.event === event
      )?.warning;

      this.#logger.warn(
        `You just tried to bind an event listener to the ${event} event. ${warning}`
      );
    }

    this.ribbon.emitter.on(event, cb);

    return this;
  }

  /**
   * Raw ribbon handler.
   * @example
   * const listener = () => console.log('DM received!');
   * client.on('client.dm', listener);
   *
   * // later
   * client.off('client.dm', listener);
   */
  off<K extends keyof Events.in.all>(
    event: K,
    cb: (data: Events.in.all[K]) => void
  ): this {
    this.ribbon.emitter.off(event, cb);
    return this;
  }

  /**
   * Raw ribbon handler.
   * You might want to use `client.wait` instead.
   * @example
   * client.once('social.invite', ({ roomid }) => console.log(`Invited to room ${roomid}`));
   */
  once<K extends keyof Events.in.all>(
    event: K,
    cb: (data: Events.in.all[K]) => void
  ): this {
    this.ribbon.emitter.once(event, cb);
    return this;
  }

  /**
   * Raw ribbon handler for sending messages.
   */
  emit<K extends keyof Events.out.all>(
    event: K,
    ...data: Events.out.all[K] extends void ? [] : [Events.out.all[K]]
  ): this {
    this.ribbon.emit(event, ...data);
    return this;
  }

  /**
   * Wait for an event to occur. Wraps `client.once` into a typed Promise.
   * @returns the data from the event
   * @example
   * // wait for a notification (although you probably want to use `client.on` for this instead)
   * console.log(await client.wait('social.notification'));
   */
  wait<T extends keyof Events.in.all>(event: T) {
    return new Promise<Events.in.all[T]>((resolve) =>
      this.once(event, resolve)
    );
  }

  /**
   * Send a message and then wait for another message. Throws an error if a 'err' message is received before the response message
   * @param event - the `command` of the event to send
   * @param data - the data to send along with the command. For void (no) data, just pass in `undefined`
   * @param listen - the event to wait for before resolving.
   * @param error - a list of custom error events to listen for. Defaults to `["client.error"]`.
   * @returns the data sent by the `listen` event
   * @throws an error if the error event provided (or `client.error`) is received from TETR.IO
   * @example
   * // This is just for example, use `client.room!.chat` instead
   * await client.wrap('room.chat', { content: 'Hello', pinned: false }, 'room.chat');
   */
  wrap<O extends keyof Events.out.all, I extends keyof Events.in.all>(
    event: O,
    data: Events.out.all[O],
    listen: I,
    error: (keyof Events.in.all)[] = ["client.error"]
  ) {
    return new Promise<Events.in.all[I]>((resolve, reject) => {
      const disband = () => {
        this.off(listen, rs);
        error.forEach((err) => this.off(err, rj));
      };
      const rs = (data: Events.in.all[I]) => {
        disband();
        resolve(data);
      };

      const rj = (error: string) => {
        disband();
        reject(new Error(error));
      };

      this.on(listen, rs);
      error.forEach((err) => this.on(err, rj));

      // @ts-expect-error
      this.emit(event, data);
    });
  }

  hook() {
    return this.ribbon.emitter.hook();
  }

  /** @hidden */
  #init() {
    this.on("room.join", async () => {
      const data = await this.wait("room.update");
      this.room = new Room(this, data);
      this.emit("client.room.join", this.room!);
    });

    this.on("notify", (notif) => {
      if (typeof notif === "string") {
        return this.emit("client.notify", { msg: notif });
      } else if ("type" in notif) {
        switch (notif.type) {
          case "deny":
            this.emit("client.notify", {
              msg: notif.msg,
              color: "#FF2200",
              icon: "denied",
              timeout: notif.timeout
            });
            break;
          case "warn":
            this.emit("client.notify", {
              msg: notif.msg,
              color: "#FFF43C",
              icon: "warning"
            });
            break;
          case "err":
            this.emit("client.error", notif.msg);
            this.emit("client.notify", {
              msg: notif.msg,
              color: "#FF4200",
              icon: "error"
            });
            break;
          case "announce":
            this.emit("client.notify", {
              msg: notif.msg,
              color: "#FFCC00",
              icon: "announcement",
              timeout: 1e4
            });
            break;
          case "ok":
            this.emit("client.notify", {
              msg: notif.msg,
              color: "#6AFF3C",
              icon: "ok"
            });
            break;
        }
      } else {
        this.emit("client.notify", notif);
      }
    });

    this.on("staff.spam", () => {
      this.#logger.warn(
        '"staff.spam" message received. You are sending too many DMs, and some of them failed to go through. You may only send ~5 messages/250 ms.'
      );
    });

    this.on("client.dead", async () => {
      this.disconnected = true;
      this.room?.destroy();
    });
  }

  /**
   * Reconnect the client to TETR.IO.
   * @throws {Error} if the client is already connected
   */
  async reconnect() {
    if (!this.disconnected) {
      throw new Error("Client is not disconnected.");
    }

    const newRibbon = await this.ribbon.clone();
    this.ribbon.destroy();
    this.ribbon = newRibbon;

    const data = await new Promise<Events.in.Client["client.ready"]>(
      (resolve, reject) => {
        const t = setTimeout(() => {
          newRibbon.destroy();
          reject("Failed to connect");
        }, 5000);
        this.ribbon.emitter.once("client.ready", (d) => {
          if (d) {
            clearTimeout(t);
            resolve(d);
          }
        });
      }
    );
    delete this.room;
    this.social = await Social.create(this, this.social.config, data.social);

    this.#eventWarningOverrides.set("social.dm", [this.social._dmListener]);
  }

  /** The client's current handling. Do not change the client's handling while in a room. */
  get handling() {
    return this.#handling;
  }

  set handling(handling: GameTypes.Handling) {
    if (this.room)
      throw new Error(
        "Do not set the handling in a room (you will be banned)!"
      );
    this.#handling = handling;
    this.emit("config.handling", handling);
  }

  /** The client's spectating strategy. */
  get spectatingStrategy() {
    return this.#spectatingStrategy;
  }

  set spectatingStrategy(strategy: SpectatingStrategy) {
    this.#spectatingStrategy = strategy;
    if (this.game) {
      this.game._strategy = strategy;
    }
  }

  /** Clean up the client. Leaves any rooms first. */
  async destroy() {
    if (this.room) {
      try {
        this.room.destroy();
      } catch {
        /* empty */
      }
    }
    await this.ribbon.destroy();
    if (this.room) delete this.room;
    if (this.game) delete this.game;

    this.#eventWarningOverrides.clear();
  }
}
