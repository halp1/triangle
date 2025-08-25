import { type BagType, Engine, type KickTable } from "../engine";

export namespace Game {
  /** Handling config interface (test on TETR.IO for limits) */
  export interface Handling {
    arr: number;
    das: number;
    dcd: number;
    sdf: number;
    safelock: boolean;
    cancel: boolean;
    may20g: boolean;
    irs: "off" | "hold" | "tap";
    ihs: "off" | "hold" | "tap";
  }

  /** Game config preset */
  export type Preset =
    | "default"
    | "tetra league"
    | "tetra league (season 1)"
    | "enforced delays"
    | "4wide"
    | "100 battle royale"
    | "classic"
    | "arcade"
    | "bombs"
    | "quickplay";

  /** Way the garbage enters the board. `continuous` and `delayed` not yet supported */
  export type GarbageEntry = "instant" | "continuous" | "delayed";
  /** When garbage enters the board. only `combo blocking` is currently supported */
  export type GarbageBlocking = "combo blocking" | "limited blocking" | "none";
  /** Garbage target bonus not yet supported. Used in royale mode */
  export type GarbageTargetBonus = "offensive" | "defensive" | "none";
  /** Only `zero` passthrough supported */
  export type Passthrough = "zero" | "limited" | "consistent" | "full";
  /** Only `T-spins` supported */
  export type SpinBonuses =
    | "T-spins"
    | "T-spins+"
    | "all"
    | "all+"
    | "all-mini"
    | "all-mini+"
    | "mini-only"
    | "handheld"
    | "stupid"
    | "none";
  /** Whether decimal garbage is rounded down or weighted RNG rounding */
  export type RoundingMode = "down" | "rng";
  /** Only `multiplier` is currently supported */
  export type ComboTable =
    | "none"
    | "multiplier"
    | "classic guideline"
    | "modern guideline";
  /** Only `versus` supported. Client will run in `practice` but undoing is not yet implemented. */
  export type GameMode = "versus" | "royale" | "practice";

  /** Topout: Player tops themself out. Garbage smash: Player received garbage that causes them to top out. Winner: Player wins (does not die) */
  export type GameOverReason = "topout" | "garbagesmash" | "winner";

  export interface Options {
    version: number;
    seed_random: boolean;
    seed: number;
    g: number;
    stock: number;
    countdown: boolean;
    countdown_count: number;
    countdown_interval: number;
    precountdown: number;
    prestart: number;
    mission: string;
    mission_type: string;
    zoominto: string;
    slot_counter1: string;
    slot_counter2: string;
    slot_counter3: string;
    slot_counter5: string;
    slot_bar1: string;
    display_fire: boolean;
    display_username: boolean;
    hasgarbage: boolean;
    bgmnoreset: boolean;
    neverstopbgm: boolean;
    display_next: boolean;
    display_hold: boolean;
    infinite_hold: boolean;
    gmargin: number;
    gincrease: number;
    garbagemultiplier: number;
    garbagemargin: number;
    garbageincrease: number;
    garbagecap: number;
    garbagecapincrease: number;
    garbagecapmargin: number;
    garbagecapmax: number;
    garbageabsolutecap: boolean;
    garbageholesize: number;
    garbagephase: number;
    garbagequeue: boolean;
    garbageare: number;
    garbageentry: GarbageEntry;
    garbageblocking: GarbageBlocking;
    garbagetargetbonus: GarbageTargetBonus;
    garbagespecialbonus: boolean;
    presets: Preset;
    bagtype: BagType;
    spinbonuses: SpinBonuses;
    combotable: ComboTable;
    kickset: KickTable;
    nextcount: number;
    allow_harddrop: boolean;
    display_shadow: boolean;
    locktime: number;
    garbagespeed: number;
    forfeit_time: number;
    are: number;
    lineclear_are: number;
    infinitemovement: boolean;
    lockresets: number;
    allow180: boolean;
    objective: {
      type: string;
    };
    room_handling: boolean;
    room_handling_arr: number;
    room_handling_das: number;
    room_handling_sdf: number;
    manual_allowed: boolean;
    b2bchaining: boolean;
    allclears: boolean;
    clutch: boolean;
    nolockout: boolean;
    passthrough: Passthrough;
    can_undo: boolean;
    can_retry: boolean;
    retryisclear: boolean;
    noextrawidth: boolean;
    stride: boolean;
    boardwidth: number;
    boardheight: number;
    new_payback: boolean;
    messiness_change: number;
    messiness_inner: number;
    messiness_nosame: boolean;
    messiness_timeout: number;
  }

  export interface ReadyOptions {
    version: number;
    seed: number;
    seed_random: boolean;
    are: number;
    lineclear_are: number;
    g: number;
    gincrease: number;
    gmargin: number;
    gravitymay20g: boolean;
    shielded: boolean;
    hasgarbage: boolean;
    usebombs: boolean;
    garbagespeed: number;
    garbagefavor: number;
    garbagemultiplier: number;
    receivemultiplier: number;
    garbagemargin: number;
    garbageincrease: number;
    garbageholesize: number;
    garbagephase: number;
    garbagequeue: boolean;
    garbageentry: GarbageEntry;
    garbageare: number;
    garbagecap: number;
    garbagecapincrease: number;
    garbagecapmargin: number;
    garbagecapmax: number;
    garbageabsolutecap: number;
    garbageattackcap: number;
    garbagetargetbonus: GarbageTargetBonus;
    garbageblocking: GarbageBlocking;
    garbagespecialbonus: boolean;
    passthrough: Passthrough;
    openerphase: number;
    roundmode: RoundingMode;
    spinbonuses: SpinBonuses;
    combotable: ComboTable;
    kickset: KickTable;
    bagtype: BagType;
    messiness_change: number;
    messiness_inner: number;
    messiness_center?: boolean;
    messiness_nosame: boolean;
    messiness_timeout: number;
    b2bchaining: boolean;
    b2bcharging: boolean;
    b2bextras: boolean;
    b2bcharge_at: number;
    b2bcharge_base: number;
    allclears: boolean;
    allclear_garbage: number;
    allclear_b2b: number;
    allclear_b2b_sends: boolean;
    allclear_b2b_dupes: boolean;
    allclear_charges: boolean;
    allow_harddrop: boolean;
    allow180: boolean;
    infinite_hold: boolean;
    infinite_movement: boolean;
    nextcount: number;
    clutch: boolean;
    no_szo: boolean;
    nolockout: boolean;
    manual_allowed: boolean;
    new_payback: boolean;
    can_undo: boolean;
    boardwidth: number;
    boardheight: number;
    boardbuffer: number;
    stock: number;
    infinite_stock: boolean;
    locktime: number;
    lockresets: number;
    prestart: number;
    precountdown: number;
    countdown: boolean;
    countdown_count: number;
    countdown_interval: number;
    inverted: boolean;
    mission: string;
    mission_type: string;
    no_mission_sound: boolean;
    objective_type: string;
    objective_count: number;
    objective_time: number;
    objective_result: string;
    zoominto: string;
    noextrawidth: boolean;
    stride: boolean;
    pro: boolean;
    pro_alert: boolean;
    pro_retry: boolean;
    can_retry: boolean;
    slot_counter1: string;
    slot_counter2: string;
    slot_counter3: string;
    slot_counter4: string;
    slot_counter5: string;
    slot_bar1: string;
    slot_bar2: string;
    absolute_lines: boolean;
    display_zen: boolean;
    display_username: boolean;
    display_fire: boolean;
    display_replay: boolean;
    display_next: boolean;
    display_hold: boolean;
    display_shadow: boolean;
    levels: boolean;
    masterlevels: boolean;
    startinglevel: number;
    levelspeed: number;
    levelstatic: boolean;
    levelstaticspeed: number;
    levelgbase: number;
    levelgspeed: number;
    minoskin: {
      z: string;
      l: string;
      o: string;
      s: string;
      i: string;
      j: string;
      t: string;
      other: string;
      ghost: string;
    };
    boardskin: string;
    map: string;
    handling: Handling;
    room_handling: boolean;
    room_handling_arr: number;
    room_handling_das: number;
    room_handling_sdf: number;
    noreplay: boolean;
    nosound: boolean;
    bgmnoreset: boolean;
    neverstopbgm: boolean;
    song: string;
    survivalmode: string;
    survival_messiness: number;
    survival_layer_amt: number;
    survival_layer_non: boolean;
    survival_layer_min: number;
    survival_timer_itv: number;
    survival_cap: number;
    usezenconfig: boolean;
    zenlevels: boolean;
    zenlevel: number;
    zenprogress: number;
    nosiren: boolean;
    anchorseed: boolean;
    forfeit_time: number;
    username: string;
    latencymode: string;
    fulloffset: number;
    fullinterval: number;
    fromretry: boolean;
    retryisclear: boolean;
    topoutisclear: boolean;
    zenith: boolean;
    zenith_expert: boolean;
    zenith_doublehole: boolean;
    zenith_volatile: boolean;
    zenith_gravity: boolean;
    zenith_messy: boolean;
    zenith_invisible: boolean;
    zenith_allspin: boolean;
    zenith_duo: boolean;
    zenith_mods: any[];
    zenith_ally: any[];
    zenith_allyexpert: boolean;
    TEMP_zenith_rng: boolean;
    TEMP_zenith_grace: string;
  }

  export interface Ready {
    players: {
      gameid: number;
      userid: string;
      options: ReadyOptions;
      alive: boolean;
      naturalorder: number;
    }[];
    isNew: boolean;
  }

  export namespace IGEs {
    export type all = Target | AllowTargeting | Interaction | KEV;

    export interface Target {
      type: "target";
      data: {
        targets: number[];
      };
    }
    export interface AllowTargeting {
      type: "allow_targeting";
      data: {
        value: boolean;
      };
    }

    export namespace Interactions {
      export type all = Garbage | Targeted;

      export interface Garbage {
        type: "garbage";
        frame: number;
        gameid: number;
        iid: number;
        cid: number;
        ackiid: number;
        amt: number;
        x: number;
        y: number;
        size: number;
        zthalt?: any; //! IRRELEVANT (qp)
      }

      export interface Targeted {
        // TODO: check this
        type: "targeted";
        value: boolean;
      }
    }

    export interface Interaction {
      type: "interaction" | "interaction_confirm";
      data: Interactions.all;
    }

    export interface KEV {
      type: "kev";
      data: {
        victim: {
          gameid: number;
        };
        killer: {
          gameid: number;
        };
        fire: number;
      };
    }
  }

  export interface IGEBase {
    id: number;
    frame: number;
  }

  export type IGE = IGEBase & IGEs.all;

  export interface Leaderboard {
    id: string;
    username: string;
    active: boolean;
    naturalorder: number;
    shadows: any[];
    shadowedBy: (null | any)[];
    wins: number;
    stats: {
      apm: number | null;
      pps: number | null;
      vsscore: number | null;
      garbagesent: number;
      garbagereceived: number;
      kills: number;
      altitude: number;
      rank: number;
      targetingfactor: number;
      targetinggrace: number;
      btb: number;
      revives: number;
      escapeartist: number;
      blockrationing_app: number;
      blockrationing_final: number;
    };
  }

  export type Key =
    | "moveLeft"
    | "moveRight"
    | "rotateCW"
    | "rotateCCW"
    | "rotate180"
    | "softDrop"
    | "hardDrop"
    | "hold";
  export namespace Replay {
    export namespace Frames {
      export type all =
        | Start
        | Full
        | IGE
        | Keypress
        | End
        | Strategy
        | ManualTarget;

      export interface Start {
        type: "start";
        data: {};
      }

      export interface Full {
        type: "full";
        data: {
          game: {
            board: BoardSquare[][];
            bag: Mino[];
            hold: {
              piece: null | Mino;
              locked: boolean;
            };
            g: number;
            controlling: {
              lShift: {
                held: boolean;
                arr: number;
                das: number;
                dir: -1;
              };
              rShift: {
                held: boolean;
                arr: number;
                das: number;
                dir: 1;
              };
              lastshift: 1 | -1;
              inputSoftdrop: boolean;
            };
            falling: {
              type: Mino;
              x: number;
              y: number;
              r: number;
              hy: number;
              irs: number;
              kick: number;
              keys: number;
              flags: number;
              safelock: number;
              locking: number;
              lockresets: number;
              rotresets: number;
              skip: number[];
            };
            handling: Handling;
            playing: boolean;
          };

          stats: {
            lines: number;
            level_lines: number;
            level_lines_needed: number;
            inputs: number;
            holds: number;
            score: number;
            zenlevel: number;
            zenprogress: number;
            level: number;
            combo: number;
            topcombo: number;
            combopower: number;
            btb: number;
            topbtb: number;
            btbpower: number;
            tspins: number;
            piecesplaced: number;
            clears: {
              singles: number;
              doubles: number;
              triples: number;
              quads: number;
              pentas: number;
              realtspins: number;
              minitspins: number;
              minitspinsingles: number;
              tspinsingles: number;
              minitspindoubles: number;
              tspindoubles: number;
              minitspintriples: number;
              tspintriples: number;
              minitspinquads: number;
              tspinquads: number;
              tspinpentas: number;
              allclear: number;
            };
            garbage: {
              sent: number;
              sent_nomult: number;
              maxspike: number;
              maxspike_nomult: number;
              received: number;
              attack: number;
              cleared: number;
            };
            kills: number;
            finesse: {
              combo: number;
              faults: number;
              perfectpieces: number;
            };
            zenith: {
              altitude: number;
              rank: number;
              peakrank: number;
              avgrankpts: number;
              floor: number;
              targetingfactor: number;
              targetinggrace: number;
              totalbonus: number;
              revives: number;
              revivesTotal: number;
              revivesMaxOfBoth: number;
              speedrun: boolean;
              speedrun_seen: boolean;
              splits: number[];
            };
          };

          diyusi: number;
        };
      }

      export interface IGE {
        type: "ige";
        data: IGEs.all;
      }

      export interface Keypress {
        type: "keydown" | "keyup";
        data: {
          key: Key;
          subframe: number;
          hoisted?: boolean;
        };
      }

      export interface End {
        type: "end";
        data: any; // TODO: type this
      }

      export interface Strategy {
        type: "strategy";
        /** Even, Eliminations, Random, and Payback (0, 1, 2, 3) */
        data: 0 | 1 | 2 | 3;
      }

      export interface ManualTarget {
        type: "manual_target";
        data: number;
      }
    }

    export type Frame = Frames.all & { frame: number };
  }

  export type Mino = "s" | "z" | "j" | "l" | "i" | "t" | "o";
  export type BoardSquare = Mino | "gb" | null;

  export namespace Client {
    export type Event = Garbage | Frameset;
    /** @deprecated */
    export type Events = Event;

    export interface Frameset {
      type: "frameset";
      provisioned: number;
      frames: Game.Replay.Frame[];
    }

    export interface Garbage {
      type: "garbage";
      frame: number;
      amount: number;
      size: number;
      column: number;
    }
  }

  export type Target =
    | {
        strategy: "even" | "elims" | "random" | "payback";
      }
    | {
        strategy: "manual";
        target: number;
      };

  export namespace Tick {
    export interface In {
      gameid: number;
      frame: number;
      events: Client.Events[];
      engine: Engine;
    }

    export interface Keypress {
      type: "keydown" | "keyup";
      frame: number;
      data: {
        key: Key;
        /** The 1-digit decimal part of the frame (`.0 | .1 | .2 | .3 | .4 | .5 | .6 | .7 | .8 | .9`) */
        subframe: number;
      };
    }

    export interface Out {
      keys?: Keypress[];
      runAfter?: (() => void)[];
    }

    export type Func = (data: In) => Promise<Out> | Out;
  }
}
