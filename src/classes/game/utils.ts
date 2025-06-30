import { Queue } from "../../engine";
import type { Game } from "../../types";

export const getFullFrame = (
  options: Game.ReadyOptions
): Game.Replay.Frames.Full & { frame: number } => ({
  type: "full",
  frame: 0,
  data: {
    game: {
      board: Array.from({ length: options.boardheight + 20 }, () =>
        Array.from({ length: options.boardwidth }, () => null)
      ),
      bag: new Queue({
        type: options.bagtype,
        minLength: 7,
        seed: options.seed
      }).value as Game.Mino[],
      hold: {
        piece: null,
        locked: false
      },
      g: options.g,
      controlling: {
        lShift: {
          held: false,
          arr: 0,
          das: 0,
          dir: -1
        },
        rShift: {
          held: false,
          arr: 0,
          das: 0,
          dir: 1
        },
        lastshift: -1,
        inputSoftdrop: false
      },
      falling: {
        type: "i",
        x: 0,
        y: 0,
        r: 0,
        hy: 0,
        irs: 0,
        kick: 0,
        keys: 0,
        flags: 0,
        safelock: 0,
        locking: 0,
        lockresets: 0,
        rotresets: 0,
        skip: []
      },
      handling: options.handling,
      playing: true
    },
    stats: {
      lines: 0,
      level_lines: 0,
      level_lines_needed: 1,
      inputs: 0,
      holds: 0,
      score: 0,
      zenlevel: 1,
      zenprogress: 0,
      level: 1,
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
        rank: 1,
        peakrank: 1,
        avgrankpts: 0,
        floor: 0,
        targetingfactor: 3,
        targetinggrace: 0,
        totalbonus: 0,
        revives: 0,
        revivesTotal: 0,
        revivesMaxOfBoth: 0,
        speedrun: false,
        speedrun_seen: false,
        splits: [0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    },
    diyusi: 0
  }
});

/** round frame */
export const rf = (frame: number) => Math.round(frame * 10) / 10;
/** split frame */
export const sf = (frame: number) => [
  Math.floor(frame),
  Math.round((frame % 1) * 10) / 10
];
