import { Room } from ".";
import { Events, type Game, type VersusReplay } from "../../types";
import { Game as GameClass } from "../game";

export class ReplayManager {
  #replay: VersusReplay;
  constructor(
    readyPlayers: Game.Ready["players"],
    roomPlayers: Room["players"]
  ) {
    this.#replay = {
      gamemode: null,
      id: null,
      ts: new Date().toString(),
      version: 1,
      users: readyPlayers
        .map((p) => roomPlayers.find((pl) => pl._id === p.userid)!)
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
        leaderboard: readyPlayers.map(
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
  }

  addRound(players: Game.Ready["players"]) {
    this.#replay.replay.rounds.push(
      players.map((p) => ({
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
            gameoverreason: "x" as any
          }
        }
      }))
    );
  }

  pipe({ gameid, frames }: { gameid: number; frames: Game.Replay.Frame[] }) {
    const p = this.#replay.replay.rounds
      .at(-1)!
      .find((p) => p.replay.options.gameid === gameid);
    if (!p) return;
    p.replay.frames = frames.reduce(
      (acc, frame) => Math.max(acc, frame.frame),
      p.replay.frames
    );
    p.replay.events.push(...frames);
  }

  die({
    gameid,
    data,
    game
  }: {
    gameid: number;
    data?: Events.in.Game["game.replay.end"]["data"];
    game?: GameClass;
  }) {
    const p = this.#replay.replay.rounds
      .at(-1)!
      .find((p) => p.replay.options.gameid === gameid);
    if (p && p.replay.results.gameoverreason === ("x" as any)) {
      p.replay.results.gameoverreason = data?.gameoverreason ?? "winner";
      p.alive = (data?.gameoverreason ?? "winner") === "winner";
      p.active = true;
      p.lifetime = (p.replay.frames * 1000) / GameClass.fps;
      if (game) {
        const e = game.players.find((p) => p.gameid === gameid)?.engine;
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

  endRound({ game }: { game?: GameClass }) {
    if (!game) return;
    for (const p of game.players) {
      this.die({
        gameid: p.gameid,
        game
      });
    }
  }

  end({ self }: { self: string }) {
    this.#replay.ts = new Date().toString();
    this.#replay.replay.leaderboard.forEach((user) => {
      const rounds = this.#replay.replay.rounds
        .map((r) => r.find((p) => p.id === user.id)!)
        .filter((r) => r);
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
    this.#replay.replay.leaderboard = this.#replay.replay.leaderboard
      .toSorted((a, b) => {
        if (a.id === self) return -1;
        if (b.id === self) return 1;
        return a.naturalorder - b.naturalorder;
      })
      .map((user, i) => {
        user.naturalorder = i;
        return user;
      });

    this.#replay.replay.rounds = this.#replay.replay.rounds.map((round) =>
      round
        .toSorted((a, b) => {
          if (a.id === self) return -1;
          if (b.id === self) return 1;
          return a.naturalorder - b.naturalorder;
        })
        .map((user, i) => {
          user.naturalorder = i;
          return user;
        })
    );
  }

  export() {
    return this.#replay;
  }
}
