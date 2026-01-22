import type { Events, Game as GameTypes, Room as RoomTypes } from "../../types";
import { Client } from "../client";
import type { Hook } from "../client/hook";
import { Game } from "../game";
import { roomConfigPresets } from "./presets";
import { ReplayManager } from "./replayManager";
import type { SpectateData } from "./types";

export class Room {
  #client: Client;
  #hook: Hook<Events.in.all>;
  /** the ID of the room */
  id!: string;
  /** Whether or not the room is public */
  public!: boolean;
  /** The type of the room */
  type!: RoomTypes.Type;
  /** Name of the room */
  name!: string;
  /** Safe Name of the room */
  name_safe!: string;
  /** UID of the host */
  owner!: string;
  /** UID of the room creator (this person can reclaim host) */
  creator!: string;
  /** The autostart state of the room */
  auto!: RoomTypes.Autostart;
  /** The autostart config of the room */
  autoStart!: number;
  /** The match config for the room */
  match!: RoomTypes.Match;
  /** The maxiumum number of players that can play in the room (override by moving as host) */
  userLimit!: number;
  /** The players in the room */
  players!: RoomTypes.Player[];
  /** The room config. Note that TETR.IO does not send all options when joining a room, and some properties may not be present (hence the `Partial`) */
  options!: Partial<GameTypes.Options>;
  /** The current state of the room (ingame | lobby) */
  state!: RoomTypes.State;
  /** The time the last game started */
  gameStart: number | null = null;
  /** The replay data for the last played game */
  replay: ReplayManager | null = null;
  /** Whether or not the room allows anonymous users */
  allowAnonymous!: boolean;
  /** Whether or not the room allows unranked users */
  allowUnranked!: boolean;
  /** Whether or not the room allows users queued for TL */
  allowQueued!: boolean;
  /** Whether or not the room allows bots */
  allowBots!: boolean;
  /** The user rank limit to play in the room */
  userRankLimit!: GameTypes.Rank;
  /** Whether or not to use best rank as limit */
  useBestRankAsLimit!: boolean;
  /** The background image of the lobby */
  lobbybg!: string | null;
  /** The background music of the lobby */
  lobbybgm!: string;
  /** The background music of the game */
  gamebgm!: string;
  /** Whether or not to force require XP to chat */
  forceRequireXPToChat!: boolean;
  /** The list of available BGMs */
  bgmList!: unknown[];
  /** The room constants */
  constants!: unknown;
  /** Whether or not chatting is allowed */
  allowChat!: boolean;

  /** Room chat history */
  chats: Events.in.Room["room.chat"][] = [];

  /** @hideconstructor */
  constructor(client: Client, data: Events.in.Room["room.update"]) {
    this.#client = client;
    this.#hook = client.hook();

    this.#handleUpdate(data);

    this.#init();
  }

  #handleUpdate(data: Events.in.Room["room.update"]) {
    this.id = data.id;
    this.auto = data.auto;

    [
      "public",
      "type",
      "name",
      "name_safe",
      "owner",
      "creator",
      "state",
      "autoStar",
      "match",
      "players",
      "userLimit",
      "allowChat",
      "allowAnonymous",
      "allowUnranked",
      "allowQueued",
      "allowBots",
      "userRankLimit",
      "useBestRankAsLimit",
      "lobbybg",
      "lobbybgm",
      "gamebgm",
      "forceRequireXPToChat",
      "bgmList",
      "constants"
    ].forEach((key) =>
      Object.assign(this, { [key]: data[key as keyof typeof data] })
    );

    this.options = Object.assign(this.options ?? {}, data.options ?? {});
  }

  #init() {
    const emitPlayers = () =>
      this.#client.emit("client.room.players", this.players);
    let abortTimeout: NodeJS.Timeout | null = null;
    this.#hook.on("room.update.host", (data) => {
      this.owner = data;
      emitPlayers();
    });

    this.#hook.on("room.update.bracket", (data) => {
      const idx = this.players.findIndex((p) => p._id === data.uid);
      if (idx >= 0) this.players[idx].bracket = data.bracket;
      emitPlayers();
    });

    this.#hook.on("room.update.auto", (auto) => {
      this.auto = auto;
    });

    this.#hook.on("room.update", this.#handleUpdate.bind(this));
    this.#hook.on("room.player.add", (data) => {
      this.players.push(data);
      emitPlayers();
    });

    this.#hook.on("room.player.remove", (data) => {
      this.players = this.players.filter((p) => p._id !== data);
      emitPlayers();
    });

    this.#hook.on("game.ready", (data) => {
      try {
        this.#client.game = new Game(this.#client, data.players);
      } catch {
        return; // not in room, don't do anything
      }
      if (data.isNew) {
        this.gameStart = performance.now();
        this.replay = new ReplayManager(data.players, this.players);

        this.#client.emit("client.game.start", {
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

    this.#hook.on("game.replay", (event) => this.replay?.pipe(event));

    this.#hook.on("game.replay.end", async ({ gameid, data }) => {
      this.replay?.die({ gameid, data, game: this.#client.game });
      if (!this.#client.game || this.#client.game.self?.gameid !== gameid)
        return;
      this.#client.game.self?.destroy();
      this.#client.emit("client.game.over", { reason: "finish", data });
    });

    this.#hook.on("game.advance", () => {
      this.replay?.endRound({ game: this.#client.game });
      if (this.#client.game) {
        this.#client.game = this.#client.game.destroy();
        this.#client.emit("client.game.over", { reason: "end" });
      }
    });

    this.#hook.on("game.score", (data) => {
      if (this.#client.game) {
        this.#client.game = this.#client.game.destroy();
      }

      this.#client.emit(
        "client.game.round.end",
        data.scoreboard?.[0]?.id ?? null
      );
    });

    this.#hook.on("game.abort", () => {
      if (abortTimeout) return;

      abortTimeout = setTimeout(() => {
        abortTimeout = null;
      }, 50);

      this.#client.emit("client.game.abort");

      if (!this.#client.game) return;
      this.#client.game = this.#client.game.destroy();
      this.#client.emit("client.game.over", { reason: "abort" });
    });

    this.#hook.on("game.end", (data) => {
      const useScoreboard = this.match.ft === 1 && this.match.wb === 1;
      const board = useScoreboard ? data.scoreboard : data.leaderboard;
      this.#client.emit("client.game.round.end", board?.[0]?.id ?? null);

      const duration = performance.now() - (this.gameStart ?? 0);
      if (useScoreboard) {
        this.#client.emit("client.game.end", {
          duration,
          source: "scoreboard",
          players: data.scoreboard.map((item) => ({
            id: item.id,
            name: item.username,
            points: item.alive && item.active ? 1 : 0,
            won: item.alive && item.active,
            lifetime: item.lifetime,
            raw: item
          }))
        });
      } else {
        const maxWins = data.leaderboard.reduce(
          (max, item) => Math.max(max, item.wins),
          0
        );
        this.#client.emit("client.game.end", {
          duration: performance.now() - (this.gameStart ?? 0),
          source: "leaderboard",
          players: data.leaderboard.map(
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
      }

      if (!this.#client.game) return;
      this.#client.game = this.#client.game.destroy();
      this.#client.emit("client.game.over", { reason: "end" });
    });

    this.#hook.on("client.game.end", () =>
      this.replay?.end({ self: this.#client.user.id })
    );

    // chat
    this.#hook.on("room.chat", (item) => this.chats.push(item));

    // get booted
    this.#hook.on("room.kick", () => this.destroy());
    this.#hook.on("room.leave", () => this.destroy());
  }

  /** Whether or not the client is the host */
  get isHost() {
    return this.#client.user.id === this.owner;
  }

  get self() {
    return this.players.find((p) => p._id === this.#client.user.id) ?? null;
  }

  /**
   * For internal use only. Use `room.leave()` instead.
   */
  destroy() {
    this.#hook.destroy();
    if (this.#client.game) {
      this.#client.game.destroy();
      this.#client.emit("client.game.over", { reason: "leave" });
    }

    delete this.#client.room;
  }

  /**
   * Leave the current room
   * @example
   * await client.room!.leave();
   */
  async leave() {
    await this.#client.wrap("room.leave", undefined, "room.leave");
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
    return await this.#client.wrap(
      "room.kick",
      { uid: id, duration },
      "room.player.remove"
    );
  }

  /**
   * Ban a user from the room (if host)
   * Uses `room.kick` under the hood, the same way TETR.IO does
   * @param id - id of user to ban
   * @example
   * await client.room!.ban('646f633d276f42a80ba44304');
   */
  async ban(id: string) {
    return await this.kick(id, 2592e3);
  }

  /**
   * Unban a user from the room
   * @example
   * client.room!.unban('halp');
   */
  unban(username: string) {
    return this.#client.emit("room.unban", username);
  }

  /**
   * Send a  message to the room's chat.
   * The `pinned` parameter is the same as using the `/announce` command in TETR.IO
   * The `pinned` parameter being true will result in an error if the client is not host.
   * @example
   * await client.room!.chat('hi!');
   * @example
   * await client.room!.chat('Important info:', true);
   */
  async chat(message: string, pinned = false) {
    return await this.#client.wrap(
      "room.chat.send",
      { content: message, pinned },
      "room.chat"
    );
  }

  /**
   * Clears the chat
   */
  async clearChat() {
    return await this.#client.wrap(
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
    return await this.#client.wrap(
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
  async update(...options: RoomTypes.SetConfigItem[]) {
    return await this.#client.wrap(
      "room.setconfig",
      options.map((opt) =>
        typeof opt.value === "number"
          ? { index: opt.index, value: opt.value.toString() }
          : typeof opt.value === "boolean"
            ? { index: opt.index, value: opt.value ? 1 : 0 }
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
    return await this.#client.wrap("room.start", undefined, "game.ready");
  }

  /**
   * Abort the game
   */
  async abort() {
    return await this.#client.wrap("room.abort", undefined, "game.abort");
  }

  /**
   * Start spectating a game.
   * @returns {Promise<SpectateData | void>} The current state of the game being spectated.
   *
   * @example
   * const data = await client.room!.spectate();
   */
  async spectate(): Promise<SpectateData | void> {
    if (this.#client.game) {
      // todo: do something here!
      return;
    }

    const spectateData = await this.#client.wrap(
      "game.spectate",
      undefined,
      "game.spectate"
    );

    this.#client.game = new Game(this.#client, spectateData.players);

    return {
      match: spectateData.match.rb.options,
      players: spectateData.match.rb.leaderboard.map(
        (p): SpectateData["players"][number] => ({
          active: p.active,
          naturalorder: p.naturalorder,
          userID: p.id,
          username: p.username,
          wins: p.wins
        })
      )
    };
  }

  /**
   * Stop spectating the current game.
   * @example
   * await client.room!.unspectate();
   */
  async unspectate() {
    if (!this.#client.game) return;

    this.#client.game.unspectate("all");

    this.#client.game = this.#client.game.destroy();
  }

  /**
   * Give the host to someone else
   * @example
   * await client.room!.transferHost(await client.social.resolve('halp'));
   */
  async transferHost(player: string) {
    return await this.#client.wrap(
      "room.owner.transfer",
      player,
      "room.update.host"
    );
  }

  /** Take host if you created the room */
  async takeHost() {
    return await this.#client.wrap(
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
        (p) => p._id === this.#client.user.id && p.bracket === bracket
      )
    )
      return;

    return await this.#client.wrap(
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

    return await this.#client.wrap(
      "room.bracket.move",
      { uid, bracket },
      "room.update.bracket"
    );
  }
}

export { ReplayManager } from "./replayManager";
export * from "./types";
