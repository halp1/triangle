import type { Types } from "../..";
import type { Events, Game as GameTypes } from "../../types";
import { API, CONSTANTS, parseToken } from "../../utils";
import { Game } from "../game";
import { Ribbon } from "../ribbon";
import { Room } from "../room";
import { Social } from "../social";
import { ClientUtils } from "../utils";
import type { ClientOptions, ClientUser } from "./types";

export type * from "./types";

export class Client {
  /** User information */
  public user: ClientUser;
  /** Whether the client has been disconnected. If true, the client needs to be reconnected with `.reconnect()` or destroyed */
  public disconnected: boolean = false;
  /**
   * Utils for the client.
   * @deprecated - functionality has been moved to other sections. This may be removed in the future.
   */
  public utils: ClientUtils;
  /** The client's token */
  public token: string;
  /** @hidden */
  private _handling: GameTypes.Handling;

  /** Raw ribbon client, the backbone of TETR.IO multiplayer. You probably don't want to touch this unless you know what you are doing. */
  public ribbon: Ribbon;
  /** A helpful manager for all things social on TETR.IO (friends, dms etc.) */
  public social!: Social;
  /** The room the client is in (if it is in a room). You can make it non-nullable with `client.room!` */
  public room?: Room;
  /** The game the client is currently in if it is in a game. */
  public game?: Game;

  /** Useful for connecting to the main game API when none of the client helpers have the request you want to send. You can use `client.api.get` and `client.api.post` to easily send GET and POST requests. */
  public api: API;

  public rooms: {
    list(): ReturnType<API["rooms"]>;
    join(id: string): Promise<Room>;
    create(type?: "public" | "private"): Promise<Room>;
  };

  /**
   * Raw ribbon handler.
   * @example
   * client.on('social.dm', () => console.log('DM received!'));
   */
  public on: typeof this.ribbon.emitter.on;
  /** Raw ribbon handler. */
  public off: typeof this.ribbon.emitter.off;
  /** Raw ribbon handler. You likely want to use `client.wait` instead. */
  public once: typeof this.ribbon.emitter.once;
  /** Raw ribbon handler for sending messages. */
  public emit: typeof this.ribbon.emit;

  /** @hideconstructor */
  private constructor(
    token: string,
    sessionID: string,
    ribbon: Ribbon,
    me: Awaited<ReturnType<API["users"]["me"]>>,
    userAgent: string = CONSTANTS.userAgent,
    handling: GameTypes.Handling
  ) {
    this.token = token;
    this.ribbon = ribbon;
    this.on = ribbon.emitter.on.bind(ribbon.emitter);
    this.off = ribbon.emitter.off.bind(ribbon.emitter);
    this.once = ribbon.emitter.once.bind(ribbon.emitter);
    this.emit = ribbon.emit.bind(ribbon);

    this.user = {
      id: me._id,
      role: me.role,
      sessionID,
      username: me.username,
      userAgent
    };

    this._handling = handling;

    this.utils = new ClientUtils(this);

    this.api = new API({ token: this.token, userAgent });

    this.rooms = {
      list: () => this.api.rooms(),
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

    this.init();
  }

  /**
   * Create a new client
   * @example
   * const client = await Client.connect({ token: 'your.jwt.token' });
   * @example
   * const client = await Client.connect({ username: 'halp', password: 'password' });
   * @example
   * // If playing games, pass in handling
   * const client = await Client.connect({
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
   * const client = await Client.connect({
   *   // ...login info
   *   userAgent: "v8/001"
   * });
   */
  static async connect(options: ClientOptions) {
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
      self = await api.users.authenticate(options.username.toLowerCase(), options.password);
    } else {
      throw new Error("Invalid client options");
    }

    const token = self.token;

    api.update({ token });
    const me = api.users.me();

    const handling: Types.Game.Handling = options.handling || {
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
          reject("Failed to connect");
        }, 5000);
        ribbon.emitter.once("client.ready", (d) => {
          if (d) {
            clearTimeout(t);
            resolve(d);
          }
        });
      }
    );

    const client = new Client(
      token,
      sessionID,
      ribbon,
      await me,
      options.userAgent || CONSTANTS.userAgent,
      handling
    );

    client.social = await Social.create(
      client,
      options.social || {},
      data.social
    );

    return client;
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
   * @param error - a list of custom error events to listen for. Defaults to `[client.error]`.
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
        reject(error);
      };

      this.on(listen, rs);
      error.forEach((err) => this.on(err, rj));

      // @ts-expect-error
      this.emit(event, data);
    });
  }

  /** @hidden */
  private init() {
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

    this.on("client.dead", async () => {
      this.disconnected = true;
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
  }

  /** The client's current handling. */
  get handling() {
    return this._handling;
  }

  /** Change the client's current handling (do not use while in a room) */
  set handling(handling: GameTypes.Handling) {
    if (this.room)
      throw new Error(
        "Do not set the handling in a room (you will be banned)!"
      );
    this._handling = handling;
    this.emit("config.handling", handling);
  }

  /** Clean up the client. Leaves any rooms first. */
  async destroy() {
    if (this.room) {
      try {
        await this.room.leave();
      } catch (e) {}
    }
    this.ribbon.destroy();
    if (this.room) delete this.room;
    if (this.game) delete this.game;
  }
}
