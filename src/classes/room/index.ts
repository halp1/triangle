import {
  Events,
  Game as GameTypes,
  Room as RoomTypes,
  Utils,
  VersusReplay
} from "../../types";
import { Client } from "../client";
import { Game } from "../game";
import { roomConfigPresets } from "./presets";

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
  public replay: VersusReplay | null = null;

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
        this.gameStart = performance.now();
      } catch {
        return; // not in room, don't do anything
      }
      if (data.isNew) {
        this.replay = {
          gamemode: null,
          id: null,
          ts: new Date().toString(),
          version: 1,
          users: data.players
            .map((p) => this.players.find((pl) => pl._id === p.userid)!)
            .map(
              (p) =>
                ({
                  id: p._id,
                  username: p.username,
                  avatar_revision: 0,
                  banner_revision: 0,
                  flags: 0,
                  country: p.country
                }) satisfies VersusReplay["users"][number]
            ),
          replay: {
            leaderboard: data.players.map(
              (p) =>
                ({
                  id: p.userid,
                  username: p.options.username,
                  wins: 0,
                  active: true,
                  shadowedBy: [null, null],
                  shadows: [],
                  naturalorder: p.naturalorder,
                  stats: {
                    apm: 0,
                    pps: 0,
                    vsscore: 0,
                    garbagesent: 0,
                    garbagereceived: 0,
                    kills: 0,
                    altitude: 0,
                    rank: 0,
                    targetingfactor: 0,
                    targetinggrace: 0,
                    btb: 0,
                    revives: 0,
                    escapeartist: null,
                    blockrationing_app: null,
                    blockrationing_final: null
                  }
                }) satisfies VersusReplay["replay"]["leaderboard"][number]
            ),
            rounds: []
          }
        };

        this.client.emit("client.game.start", {
          ...(data.isNew
            ? {
                multi: true,
                ft: this.match.ft,
                wb: this.match.wb
              }
            : { multi: false }),
          players: data.players.map((p) => ({
            id: p.userid,
            name: p.options.username,
            points: 0 as const
          }))
        });
      }

      this.replay!.replay.rounds.push(
        data.players.map((p) => ({
          active: true,
          alive: true,
          naturalorder: p.naturalorder,
          id: p.userid,
          lifetime: 0,
          shadows: [],
          shadowedBy: [null, null],
          stats: {
            apm: 0,
            pps: 0,
            vsscore: 0,
            garbagesent: 0,
            garbagereceived: 0,
            kills: 0,
            altitude: 0,
            rank: 0,
            targetingfactor: 0,
            targetinggrace: 0,
            btb: 0,
            revives: 0
          },
          replay: {
            frames: 0,
            events: [],
            options: {
              ...p.options,
              gameid: p.gameid
            },
            results: {
              aggregatestats: {
                apm: 0,
                pps: 0,
                vsscore: 0
              },
              stats: {
                lines: 0,
                level_lines: 0,
                level_lines_needed: 0,
                inputs: 0,
                holds: 0,
                score: 0,
                zenlevel: 0,
                zenprogress: 0,
                level: 0,
                combo: 0,
                topcombo: 0,
                combopower: 0,
                btb: 0,
                topbtb: 0,
                btbpower: 0,
                tspins: 0,
                piecesplaced: 0,
                clears: {
                  singles: 0,
                  doubles: 0,
                  triples: 0,
                  quads: 0,
                  pentas: 0,
                  realtspins: 0,
                  minitspins: 0,
                  minitspinsingles: 0,
                  tspinsingles: 0,
                  minitspindoubles: 0,
                  tspindoubles: 0,
                  minitspintriples: 0,
                  tspintriples: 0,
                  minitspinquads: 0,
                  tspinquads: 0,
                  tspinpentas: 0,
                  allclear: 0
                },
                garbage: {
                  sent: 0,
                  sent_nomult: 0,
                  maxspike: 0,
                  maxspike_nomult: 0,
                  received: 0,
                  attack: 0,
                  cleared: 0
                },
                kills: 0,
                finesse: {
                  combo: 0,
                  faults: 0,
                  perfectpieces: 0
                },
                zenith: {
                  altitude: 0,
                  rank: 0,
                  peakrank: 0,
                  avgrankpts: 0,
                  floor: 0,
                  targetingfactor: 0,
                  targetinggrace: 0,
                  totalbonus: 0,
                  revives: 0,
                  revivesTotal: 0,
                  revivesMaxOfBoth: 0,
                  speedrun: false,
                  speedrun_seen: false,
                  splits: [0, 0, 0, 0, 0, 0, 0, 0, 0]
                },
                finaltime: 0
              },
              gameoverreason: "winner"
            }
          }
        }))
      );
    });

    this.listen("game.replay", ({ gameid, frames }) => {
      const p = this.replay?.replay.rounds
        .at(-1)!
        .find((p) => p.replay.options.gameid === gameid);
      if (!p) return;
      p.replay.frames = frames.reduce(
        (acc, frame) => Math.max(acc, frame.frame),
        p.replay.frames
      );
      p.replay.events.push(...frames);
    });

    this.listen("game.replay.end", async ({ gameid, data }) => {
      if (this.replay) {
        const p = this.replay.replay.rounds
          .at(-1)!
          .find((p) => p.replay.options.gameid === gameid);
        if (p) {
          p.replay.results.gameoverreason = data.gameoverreason;
          p.alive = data.gameoverreason === "winner";
          p.active = true;
          p.lifetime = (p.replay.frames * 1000) / Game.fps;
          if (this.client.game) {
            const e =
              gameid === this.client.game.gameid
                ? this.client.game.engine
                : this.client.game.players.find((p) => p.gameid === gameid)
                    ?.engine;
            if (e) {
              p.stats.apm = e.dynamicStats.apm;
              p.stats.pps = e.dynamicStats.pps;
              p.stats.vsscore = e.dynamicStats.vs;
              p.stats.garbagesent = e.stats.garbage.sent;
              p.stats.garbagereceived = e.stats.garbage.receive;
              p.replay.results.aggregatestats = {
                apm: e.dynamicStats.apm,
                pps: e.dynamicStats.pps,
                vsscore: e.dynamicStats.vs
              };
            }
          }

          if (!p.replay.events.find((f) => f.type === "end")) {
            p.replay.events.push({
              type: "end",
              frame: p.replay.frames,
              // TODO: put real data here
              data: {}
            });
          }
        }
      }
      if (!this.client.game || this.client.game.gameid !== gameid) return;
      this.client.game = this.client.game.destroy();
      this.client.emit("client.game.over", { reason: "finish", data });
    });

    this.listen("game.advance", () => {
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
      const maxWins = data.leaderboard.reduce(
        (max, item) => Math.max(max, item.wins),
        0
      );
      this.client.emit("client.game.end", {
        duration: performance.now() - (this.gameStart ?? 0),
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

      if (!this.client.game) return;
      this.client.game = this.client.game.destroy();
      this.client.emit("client.game.over", { reason: "end" });
    });

    this.listen("client.game.over", () => {
      if (this.replay) {
        this.replay.ts = new Date().toString();
        this.replay.replay.leaderboard.forEach((user) => {
          const rounds = this.replay!.replay.rounds.map(
            (r) => r.find((p) => p.id === user.id)!
          ).filter((r) => r);
          user.stats.apm =
            rounds.reduce((acc, r) => acc + r.stats.apm, 0) / rounds.length;
          user.stats.pps =
            rounds.reduce((acc, r) => acc + r.stats.pps, 0) / rounds.length;
          user.stats.vsscore =
            rounds.reduce((acc, r) => acc + r.stats.vsscore, 0) / rounds.length;
          user.stats.garbagesent = rounds.reduce(
            (acc, r) => acc + r.stats.garbagesent,
            0
          );
          user.stats.garbagereceived = rounds.reduce(
            (acc, r) => acc + r.stats.garbagereceived,
            0
          );
          user.stats.kills = rounds.reduce((acc, r) => acc + r.stats.kills, 0);
          user.wins = rounds.reduce((acc, r) => acc + (r.alive ? 1 : 0), 0);
        });
        // sort: self uesr id needs first in naturalorder
        this.replay.replay.leaderboard = this.replay.replay.leaderboard
          .toSorted((a, b) => {
            if (a.id === this.client.user.id) return -1;
            if (b.id === this.client.user.id) return 1;
            return a.naturalorder - b.naturalorder;
          })
          .map((user, i) => {
            user.naturalorder = i;
            return user;
          });

        this.replay.replay.rounds = this.replay.replay.rounds.map((round) =>
          round
            .toSorted((a, b) => {
              if (a.id === this.client.user.id) return -1;
              if (b.id === this.client.user.id) return 1;
              return a.naturalorder - b.naturalorder;
            })
            .map((user, i) => {
              user.naturalorder = i;
              return user;
            })
        );
      }
    });

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
