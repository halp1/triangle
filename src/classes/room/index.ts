import type {
  Events,
  Game as GameTypes,
  Room as RoomTypes,
  Utils
} from "../../types";
import { Client } from "../client";
import { Game } from "../game";
import { roomConfigPresets } from "./presets";
import { ReplayManager } from "./replayManager";

export class Room {
  private client: Client;
  private listeners: Parameters<typeof this.client.on>[] = [];

  /** the ID of the room */
  public id!: string;
  /** Whether or not the room is public */
  public public!: boolean;
  /** The type of the room (public | private) */
  public type!: RoomTypes.Type;
  /** Name of the room */
  public name!: string;
  /** Safe Name of the room */
  public name_safe!: string;
  /** UID of the host */
  public owner!: string;
  /** UID of the room creator (this person can reclaim host) */
  public creator!: string;
  /** The autostart state of the room */
  public autostart!: RoomTypes.Autostart;
  /** The match config for the room */
  public match!: RoomTypes.Match;
  /** The maxiumum number of players that can play in the room (override by moving as host) */
  public userLimit!: number;
  /** The players in the room */
  public players!: RoomTypes.Player[];
  /** The room config */
  public options!: GameTypes.Options;
  /** The current state of the room (ingame | lobby) */
  public state!: RoomTypes.State;
  /** The time the last game started */
  public gameStart: number | null = null;
  /** The replay data for the last played game */
  public replay: ReplayManager | null = null;

  /** Room chat history */
  public chats: Events.in.Room["room.chat"][] = [];

  /** @hideconstructor */
  constructor(client: Client, data: Events.in.Room["room.update"]) {
    this.client = client;

    this.handleUpdate(data);

    this.init();
  }

  private handleUpdate(data: Events.in.Room["room.update"]) {
    this.id = data.id;
    this.autostart = data.auto;

    [
      "public",
      "type",
      "name",
      "name_safe",
      "owner",
      "creator",
      "state",
      "match",
      "players",
      "userLimit"
    ].forEach((key) =>
      Object.assign(this, { [key]: data[key as keyof typeof data] })
    );

    this.options = data.options;
  }

  private listen<T extends keyof Events.in.all>(
    event: T,
    cb: (data: Events.in.all[T]) => void,
    once = false
  ) {
    this.listeners.push([event, cb] as any);
    if (once) {
      this.client.once(event, cb);
    } else {
      this.client.on(event, cb);
    }
  }

  private init() {
    const emitPlayers = () =>
      this.client.emit("client.room.players", this.players);
    let abortTimeout: NodeJS.Timeout | null = null;
    this.listen("room.update.host", (data) => {
      this.owner = data;
    });

    this.listen("room.update.bracket", (data) => {
      const idx = this.players.findIndex((p) => p._id === data.uid);
      if (idx >= 0) this.players[idx].bracket = data.bracket;
      emitPlayers();
    });

    this.listen("room.update.auto", (auto) => {
      this.autostart = auto;
    });

    this.listen("room.update", this.handleUpdate.bind(this));

    this.listen("room.player.add", (data) => {
      this.players.push(data);
      emitPlayers();
    });

    this.listen("room.player.remove", (data) => {
      this.players = this.players.filter((p) => p._id !== data);
      emitPlayers();
    });

    this.listen("game.ready", (data) => {
      try {
        this.client.game = new Game(this.client, data);
      } catch {
        return; // not in room, don't do anything
      }
      if (data.isNew) {
        this.gameStart = performance.now();
        this.replay = new ReplayManager(data.players, this.players);

        this.client.emit("client.game.start", {
          multi: this.match.ft > 1 || this.match.wb > 1,
          ft: this.match.ft,
          wb: this.match.wb,

          players: data.players.map((p) => ({
            id: p.userid,
            name: p.options.username,
            points: 0 as const
          }))
        });
      }

      this.replay?.addRound(data.players);
    });

    this.listen("game.replay", (event) => this.replay?.pipe(event));

    this.listen("game.replay.end", async ({ gameid, data }) => {
      this.replay?.die({ gameid, data, game: this.client.game });
      if (!this.client.game || this.client.game.gameid !== gameid) return;
      this.client.game.stop();
      this.client.emit("client.game.over", { reason: "finish", data });
    });

    this.listen("game.advance", () => {
      this.replay?.endRound({ game: this.client.game });
      if (this.client.game) {
        this.client.game = this.client.game.destroy();
        this.client.emit("client.game.over", { reason: "end" });
      }
    });

    this.listen("game.score", (data) => {
      if (this.client.game) {
        this.client.game = this.client.game.destroy();
        this.client.emit("client.game.over", { reason: "end" });
      }

      this.client.emit("client.game.round.end", data.victor);
    });

    this.listen("game.abort", () => {
      if (abortTimeout) return;

      abortTimeout = setTimeout(() => {
        abortTimeout = null;
      }, 50);

      this.client.emit("client.game.abort");

      if (!this.client.game) return;
      this.client.game = this.client.game.destroy();
      this.client.emit("client.game.over", { reason: "abort" });
    });

    this.listen("game.end", (data) => {
      this.client.emit("client.game.round.end", data.scoreboard[0]?.id ?? null);

      const maxWins = data.scoreboard.reduce(
        (max, item) => Math.max(max, item.wins),
        0
      );
      this.client.emit("client.game.end", {
        duration: performance.now() - (this.gameStart ?? 0),
        players: data.scoreboard.map(
          (item) =>
            ({
              id: item.id,
              name: item.username,
              points: item.wins,
              won: item.wins === maxWins,
              raw: item
            }) satisfies Events.in.Client["client.game.end"]["players"][number]
        )
      });

      if (!this.client.game) return;
      this.client.game = this.client.game.destroy();
      this.client.emit("client.game.over", { reason: "end" });
    });

    this.listen("client.game.end", () =>
      this.replay?.end({ self: this.client.user.id })
    );

    // chat
    this.listen("room.chat", (item) => this.chats.push(item));

    // get booted
    this.listen("room.kick", () => this.destroy());
    this.listen("room.leave", () => this.destroy());
  }

  /** Whether or not the client is the host */
  get isHost() {
    return this.client.user.id === this.owner;
  }

  private destroy() {
    this.listeners.forEach((l) => this.client.off(l[0], l[1]));
    if (this.client.game) {
      this.client.game.destroy();
      this.client.emit("client.game.over", { reason: "leave" });
    }

    delete this.client.room;
  }

  /**
   * Leave the current room
   * @example
   * await client.room!.leave();
   */
  async leave() {
    await this.client.wrap("room.leave", undefined, "room.leave");
    this.destroy();
  }

  /**
   * Kick a user from the room for a specified duration (if host)
   * @param id - id of user to kick
   * @param duration - duration to kick the user, in seconds
   * @example
   * await client.room!.kick('646f633d276f42a80ba44304', 100);
   */
  async kick(id: string, duration = 900) {
    return await this.client.wrap(
      "room.kick",
      { uid: id, duration },
      "room.player.remove"
    );
  }

  /**
   * Unban a user from the room
   * @example
   * client.room!.unban('halp');
   */
  unban(username: string) {
    return this.client.emit("room.unban", username);
  }

  /**
   * Send a public message to the room's chat.
   * The `pinned` parameter is the same as using the `/announce` command in TETR.IO
   * The `pinned` parameter being true will result in an error if the client is not host.
   * @example
   * await client.room!.chat('hi!');
   * @example
   * await client.room!.chat('Important info:', true);
   */
  async chat(message: string, pinned = false) {
    return await this.client.wrap(
      "room.chat.send",
      { content: message, pinned },
      "room.chat"
    );
  }

  /**
   * Clears the chat
   */
  async clearChat() {
    return await this.client.wrap(
      "room.chat.clear",
      undefined,
      "room.chat.clear"
    );
  }

  /**
   * Sets the room id (only works for supporter accounts)
   * @example
   * client.room!.setID('TEST');
   */
  async setID(id: string) {
    return await this.client.wrap(
      "room.setid",
      id.toUpperCase(),
      "room.update"
    );
  }

  /**
   * Update the room's config, similar to using the /set command in tetr.io
   * await client.room!.update({ index: 'name', value: 'test room'});
   * @returns
   */
  async update<T extends Utils.DeepKeys<RoomTypes.SetConfig>>(
    ...options: {
      index: T;
      value: Utils.DeepKeyValue<RoomTypes.SetConfig, T>;
    }[]
  ) {
    return await this.client.wrap(
      "room.setconfig",
      options.map((opt) =>
        typeof opt.value === "number"
          ? { index: opt.index, value: opt.value.toString() }
          : opt
      ),
      "room.update"
    );
  }

  /**
   * Sets the room's preset
   * @example
   * await client.room!.usePreset('tetra league (season 1)');
   */
  async usePreset(preset: GameTypes.Preset) {
    return await this.update(...roomConfigPresets[preset]);
  }

  /**
   * Start the game
   */
  async start() {
    return await this.client.wrap("room.start", undefined, "game.ready");
  }

  /**
   * Abort the game
   */
  async abort() {
    return await this.client.wrap("room.abort", undefined, "game.abort");
  }

  /**
   * Give the host to someone else
   * @example
   * await client.room!.transferHost(await client.social.resolve('halp'));
   */
  async transferHost(player: string) {
    return await this.client.wrap(
      "room.owner.transfer",
      player,
      "room.update.host"
    );
  }

  /** Take host if you created the room */
  async takeHost() {
    return await this.client.wrap(
      "room.owner.revoke",
      undefined,
      "room.update.host"
    );
  }

  /**
   * Switch bracket
   * @example
   * await client.room!.switch('player');
   */
  async switch(bracket: "player" | "spectator") {
    if (
      this.players.some(
        (p) => p._id === this.client.user.id && p.bracket === bracket
      )
    )
      return;

    return await this.client.wrap(
      "room.bracket.switch",
      bracket,
      "room.update.bracket"
    );
  }

  /**
   * Move someone's bracket
   * @example
   * await client.room!.move('646f633d276f42a80ba44304', 'spectator');
   */
  async move(uid: string, bracket: "player" | "spectator") {
    const player = this.players.find((p) => p._id === uid);
    if (!player) {
      throw new Error(`Player with UID ${uid} not found in room.`);
    }

    if (player.bracket === bracket) return;

    return await this.client.wrap(
      "room.bracket.move",
      { uid, bracket },
      "room.update.bracket"
    );
  }
}

export { ReplayManager } from "./replayManager";
