// src/utils/events.ts
var EventEmitter = class {
  #listeners;
  #maxListeners = 10;
  /** Enables more debugging logs for memory leaks */
  verbose = false;
  constructor() {
    this.#listeners = [];
  }
  on(event, cb) {
    this.#listeners.push([event, cb, false]);
    const listeners = this.#listeners.filter(([e]) => e === event);
    if (listeners.length > this.#maxListeners) {
      console.warn(
        `Max listeners exceeded for event "${String(event)}". Current: ${this.#listeners.filter(([e]) => e === event).length}, Max: ${this.#maxListeners}`
      );
      if (this.verbose)
        console.warn(
          `Trace: ${new Error().stack}

Listeners:
`,
          listeners.map(([_, fn]) => fn.toString()).join("\n\n")
        );
    }
    return this;
  }
  off(event, cb) {
    this.#listeners = this.#listeners.filter(
      ([e, c]) => e !== event || c !== cb
    );
    return this;
  }
  emit(event, data) {
    const toRemove = /* @__PURE__ */ new Set();
    this.#listeners.forEach(([e, cb, once], idx) => {
      if (e !== event) return;
      cb(data);
      if (once) toRemove.add(idx);
    });
    this.#listeners = this.#listeners.filter((_, idx) => !toRemove.has(idx));
    return this;
  }
  once(event, cb) {
    this.#listeners.push([event, cb, true]);
    return this;
  }
  removeAllListeners(event) {
    if (event) {
      this.#listeners = this.#listeners.filter(([e]) => e !== event);
    } else {
      this.#listeners = [];
    }
  }
  set maxListeners(n) {
    if (n <= 0 || !Number.isInteger(n)) {
      throw new RangeError("Max listeners must be a positive integer");
    }
    this.#maxListeners = n;
  }
  get maxListeners() {
    return this.#maxListeners;
  }
  export() {
    return {
      listeners: this.#listeners.map(([event, cb, once]) => ({
        event,
        cb,
        once
      })),
      maxListeners: this.#maxListeners,
      verbose: this.verbose
    };
  }
  import(data) {
    data.listeners.forEach(({ event, cb, once }) => {
      if (once) {
        this.once(event, cb);
      } else {
        this.on(event, cb);
      }
    });
    this.#maxListeners = data.maxListeners;
    this.verbose = data.verbose;
    return this;
  }
};

// src/engine/queue/types.ts
var Mino = /* @__PURE__ */ ((Mino2) => {
  Mino2["I"] = "i";
  Mino2["J"] = "j";
  Mino2["L"] = "l";
  Mino2["O"] = "o";
  Mino2["S"] = "s";
  Mino2["T"] = "t";
  Mino2["Z"] = "z";
  Mino2["GARBAGE"] = "gb";
  Mino2["BOMB"] = "bomb";
  return Mino2;
})(Mino || {});

// src/engine/board/index.ts
var Board = class {
  state;
  _height;
  _width;
  _buffer;
  constructor(options) {
    this._width = options.width;
    this._height = options.height;
    this._buffer = options.buffer;
    this.state = Array(this.fullHeight).fill(null).map(() => Array(this.width).fill(null));
  }
  get height() {
    return this._height;
  }
  set height(value) {
    this._height = value;
  }
  get width() {
    return this._width;
  }
  set width(value) {
    this._width = value;
  }
  get buffer() {
    return this._buffer;
  }
  set buffer(value) {
    this._buffer = value;
  }
  get fullHeight() {
    return this.height + this.buffer;
  }
  add(...blocks) {
    blocks.forEach(([char, x, y]) => {
      if (y < 0 || y >= this.fullHeight || x < 0 || x >= this.width) return;
      this.state[y][x] = char;
    });
  }
  clearLines() {
    let garbageCleared = 0;
    const lines = [];
    this.state.forEach((row, idx) => {
      if (row.every((block) => block !== null && block !== "bomb" /* BOMB */)) {
        lines.push(idx);
        if (row.some((block) => block === "gb" /* GARBAGE */)) garbageCleared++;
      }
    });
    [...lines].reverse().forEach((line) => {
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    });
    return { lines: lines.length, garbageCleared };
  }
  clearBombs(placedBlocks) {
    let lowestY = placedBlocks.reduce(
      (acc, [_, y]) => Math.min(acc, y),
      this.fullHeight
    );
    if (lowestY === 0) return { lines: 0, garbageCleared: 0 };
    const lowestBlocks = placedBlocks.filter(([_, y]) => y === lowestY);
    const bombColumns = lowestBlocks.filter(([x, y]) => this.state[y - 1][x] === "bomb" /* BOMB */).map(([x, _]) => x);
    if (bombColumns.length === 0) return { lines: 0, garbageCleared: 0 };
    const lines = [];
    while (lowestY > 0 && bombColumns.some((col) => this.state[lowestY - 1][col] === "bomb" /* BOMB */)) {
      lines.push(--lowestY);
    }
    if (lines.length === 0) return { lines: 0, garbageCleared: 0 };
    lines.forEach((line) => {
      this.state.splice(line, 1);
      this.state.push(new Array(this.width).fill(null));
    });
    return { lines: lines.length, garbageCleared: lines.length };
  }
  clearBombsAndLines(placedBlocks) {
    const bombs = this.clearBombs(placedBlocks);
    const lines = this.clearLines();
    return {
      lines: lines.lines + bombs.lines,
      garbageCleared: bombs.garbageCleared + lines.garbageCleared
    };
  }
  get perfectClear() {
    return this.state.every((row) => row.every((block) => block === null));
  }
  insertGarbage({
    amount,
    size,
    column,
    bombs
  }) {
    this.state.splice(
      0,
      0,
      ...Array.from(
        { length: amount },
        () => Array.from(
          { length: this.width },
          (_, idx) => idx >= column && idx < column + size ? bombs ? "bomb" /* BOMB */ : null : "gb" /* GARBAGE */
        )
      )
    );
    this.state.splice(this.fullHeight - amount - 1, amount);
  }
};

// src/engine/constants/index.ts
var constants;
((constants2) => {
  let flags;
  ((flags2) => {
    flags2.ROTATION_LEFT = 1;
    flags2.ROTATION_RIGHT = 2;
    flags2.ROTATION_180 = 4;
    flags2.ROTATION_SPIN = 8;
    flags2.ROTATION_MINI = 16;
    flags2.ROTATION_SPIN_ALL = 32;
    flags2.ROTATION_ALL = flags2.ROTATION_LEFT | flags2.ROTATION_RIGHT | flags2.ROTATION_180 | flags2.ROTATION_SPIN | flags2.ROTATION_MINI | flags2.ROTATION_SPIN_ALL;
    flags2.STATE_WALL = 64;
    flags2.STATE_SLEEP = 128;
    flags2.STATE_FLOOR = 256;
    flags2.STATE_NODRAW = 512;
    flags2.STATE_ALL = flags2.STATE_WALL | flags2.STATE_SLEEP | flags2.STATE_FLOOR | flags2.STATE_NODRAW;
    flags2.ACTION_IHS = 1024;
    flags2.ACTION_FORCELOCK = 2048;
    flags2.ACTION_SOFTDROP = 4096;
    flags2.ACTION_MOVE = 8192;
    flags2.ACTION_ROTATE = 16384;
    flags2.FLAGS_COUNT = 15;
  })(flags = constants2.flags || (constants2.flags = {}));
})(constants || (constants = {}));

// src/engine/utils/damageCalc/index.ts
var garbageData = {
  single: 0,
  double: 1,
  triple: 2,
  quad: 4,
  penta: 5,
  tspinMini: 0,
  tspin: 0,
  tspinMiniSingle: 0,
  tspinSingle: 2,
  tspinMiniDouble: 1,
  tspinMiniTriple: 2,
  tspinDouble: 4,
  tspinTriple: 6,
  tspinQuad: 10,
  tspinPenta: 12,
  backtobackBonus: 1,
  backtobackBonusLog: 0.8,
  comboMinifier: 1,
  comboMinifierLog: 1.25,
  comboBonus: 0.25,
  allClear: 10,
  comboTable: {
    none: [0],
    "classic guideline": [0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5],
    "modern guideline": [0, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4]
  }
};
var garbageCalcV2 = (data, config) => {
  let garbage = 0;
  const { spin: rawSpin, lines, piece, combo, b2b, enemies } = data;
  const {
    spinBonuses,
    comboTable,
    garbageTargetBonus,
    b2b: b2bOptions
  } = config;
  const spin = rawSpin === "none" ? null : rawSpin;
  switch (lines) {
    case 0:
      garbage = spin === "mini" ? garbageData.tspinMini : spin === "normal" ? garbageData.tspin : 0;
      break;
    case 1:
      garbage = spin === "mini" ? garbageData.tspinMiniSingle : spin === "normal" ? garbageData.tspinSingle : garbageData.single;
      break;
    case 2:
      garbage = spin === "mini" ? garbageData.tspinMiniDouble : spin === "normal" ? garbageData.tspinDouble : garbageData.double;
      break;
    case 3:
      garbage = spin === "mini" ? garbageData.tspinMiniTriple : spin === "normal" ? garbageData.tspinTriple : garbageData.triple;
      break;
    case 4:
      garbage = spin ? garbageData.tspinQuad : garbageData.quad;
      break;
    case 5:
      garbage = spin ? garbageData.tspinPenta : garbageData.penta;
      break;
    default: {
      const t = lines - 5;
      garbage = spin ? garbageData.tspinPenta + 2 * t : garbageData.penta + t;
      break;
    }
  }
  if (spin && spinBonuses === "handheld" && piece.toUpperCase() !== "T") {
    garbage /= 2;
  }
  if (lines > 0 && b2b > 0) {
    if (b2bOptions.chaining) {
      const b2bGains = garbageData.backtobackBonus * (Math.floor(1 + Math.log1p(b2b * garbageData.backtobackBonusLog)) + (b2b == 1 ? 0 : (1 + Math.log1p(b2b * garbageData.backtobackBonusLog) % 1) / 3));
      garbage += b2bGains;
    } else {
      garbage += garbageData.backtobackBonus;
    }
  }
  if (combo > 0) {
    if (comboTable === "multiplier") {
      garbage *= 1 + garbageData.comboBonus * combo;
      if (combo > 1) {
        garbage = Math.max(
          Math.log1p(
            garbageData.comboMinifier * combo * garbageData.comboMinifierLog
          ),
          garbage
        );
      }
    } else {
      const comboTableData = garbageData.comboTable[comboTable] || [0];
      garbage += comboTableData[Math.max(0, Math.min(combo - 1, comboTableData.length - 1))];
    }
  }
  let garbageBonus = 0;
  if (lines > 0 && garbageTargetBonus !== "none") {
    let targetBonus = 0;
    switch (enemies) {
      case 0:
      case 1:
        break;
      case 2:
        targetBonus += 1;
        break;
      case 3:
        targetBonus += 3;
        break;
      case 4:
        targetBonus += 5;
        break;
      case 5:
        targetBonus += 7;
        break;
      default:
        targetBonus += 9;
    }
    if (garbageTargetBonus === "normal") {
      garbage += targetBonus;
    } else {
      garbageBonus = targetBonus;
    }
  }
  return {
    garbage,
    bonus: garbageBonus
  };
};

// src/engine/utils/increase/index.ts
var IncreaseTracker = class {
  #value;
  base;
  increase;
  margin;
  frame;
  constructor(base, increase, margin) {
    this.#value = this.base = base;
    this.increase = increase;
    this.margin = margin;
    this.frame = 0;
  }
  reset() {
    this.#value = this.base;
    this.frame = 0;
  }
  tick() {
    this.frame++;
    if (this.frame > this.margin) this.#value += this.increase / 60;
    return this.get();
  }
  get() {
    return this.#value;
  }
  set(value) {
    this.#value = value;
  }
};

// src/engine/utils/kicks/data.ts
var kicks = {
  SRS: {
    kicks: {
      "01": [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      10: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      12: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      21: [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      23: [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      32: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      30: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      "03": [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      "02": [
        [0, -1],
        [1, -1],
        [-1, -1],
        [1, 0],
        [-1, 0]
      ],
      13: [
        [1, 0],
        [1, -2],
        [1, -1],
        [0, -2],
        [0, -1]
      ],
      20: [
        [0, 1],
        [-1, 1],
        [1, 1],
        [-1, 0],
        [1, 0]
      ],
      31: [
        [-1, 0],
        [-1, -2],
        [-1, -1],
        [0, -2],
        [0, -1]
      ]
    },
    i_kicks: {
      "01": [
        [-2, 0],
        [1, 0],
        [-2, 1],
        [1, -2]
      ],
      10: [
        [2, 0],
        [-1, 0],
        [2, -1],
        [-1, 2]
      ],
      12: [
        [-1, 0],
        [2, 0],
        [-1, -2],
        [2, 1]
      ],
      21: [
        [1, 0],
        [-2, 0],
        [1, 2],
        [-2, -1]
      ],
      23: [
        [2, 0],
        [-1, 0],
        [2, -1],
        [-1, 2]
      ],
      32: [
        [-2, 0],
        [1, 0],
        [-2, 1],
        [1, -2]
      ],
      30: [
        [1, 0],
        [-2, 0],
        [1, 2],
        [-2, -1]
      ],
      "03": [
        [-1, 0],
        [2, 0],
        [-1, -2],
        [2, 1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i2_kicks: {
      "01": [
        [0, -1],
        [-1, 0],
        [-1, -1]
      ],
      10: [
        [0, 1],
        [1, 0],
        [1, 1]
      ],
      12: [
        [1, 0],
        [0, -1],
        [1, 0]
      ],
      21: [
        [-1, 0],
        [0, 1],
        [-1, 0]
      ],
      23: [
        [0, 1],
        [1, 0],
        [1, -1]
      ],
      32: [
        [0, -1],
        [-1, 0],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, 1],
        [-1, 2]
      ],
      "03": [
        [1, 0],
        [0, -1],
        [1, -2]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i3_kicks: {
      "01": [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ],
      10: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ],
      12: [
        [1, 0],
        [-1, 0],
        [0, -2],
        [0, 2]
      ],
      21: [
        [-1, 0],
        [1, 0],
        [0, 2],
        [0, -2]
      ],
      23: [
        [-1, 0],
        [1, 0],
        [0, 1],
        [0, -1]
      ],
      32: [
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1]
      ],
      30: [
        [-1, 0],
        [1, 0],
        [0, 0],
        [0, 0]
      ],
      "03": [
        [1, 0],
        [-1, 0],
        [0, 0],
        [0, 0]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    l3_kicks: {
      "01": [
        [-1, 0],
        [1, 0]
      ],
      10: [
        [1, 0],
        [-1, 0]
      ],
      12: [
        [0, -1],
        [0, 1]
      ],
      21: [
        [0, 1],
        [0, -1]
      ],
      23: [
        [1, 0],
        [-1, 0]
      ],
      32: [
        [-1, 0],
        [1, 0]
      ],
      30: [
        [0, 1],
        [0, -1]
      ],
      "03": [
        [0, -1],
        [0, 1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i5_kicks: {
      "01": [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      10: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      12: [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      21: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      23: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      32: [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      30: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      "03": [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    oo_kicks: {
      "01": [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      10: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      12: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      21: [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      23: [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      32: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      "03": [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      "02": [[0, -1]],
      13: [[1, 0]],
      20: [[0, 1]],
      31: [[-1, 0]]
    },
    additional_offsets: {},
    spawn_rotation: {},
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {}
  },
  "SRS+": {
    kicks: {
      "01": [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      10: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      12: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      21: [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      23: [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      32: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      30: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      "03": [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      "02": [
        [0, -1],
        [1, -1],
        [-1, -1],
        [1, 0],
        [-1, 0]
      ],
      13: [
        [1, 0],
        [1, -2],
        [1, -1],
        [0, -2],
        [0, -1]
      ],
      20: [
        [0, 1],
        [-1, 1],
        [1, 1],
        [-1, 0],
        [1, 0]
      ],
      31: [
        [-1, 0],
        [-1, -2],
        [-1, -1],
        [0, -2],
        [0, -1]
      ]
    },
    i_kicks: {
      "01": [
        [1, 0],
        [-2, 0],
        [-2, 1],
        [1, -2]
      ],
      10: [
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1]
      ],
      12: [
        [-1, 0],
        [2, 0],
        [-1, -2],
        [2, 1]
      ],
      21: [
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2]
      ],
      23: [
        [2, 0],
        [-1, 0],
        [2, -1],
        [-1, 2]
      ],
      32: [
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1]
      ],
      30: [
        [1, 0],
        [-2, 0],
        [1, 2],
        [-2, -1]
      ],
      "03": [
        [-1, 0],
        [2, 0],
        [2, 1],
        [-1, -2]
      ],
      "02": [[0, -1]],
      13: [[1, 0]],
      20: [[0, 1]],
      31: [[-1, 0]]
    },
    i2_kicks: {
      "01": [
        [0, -1],
        [-1, 0],
        [-1, -1]
      ],
      10: [
        [0, 1],
        [1, 0],
        [1, 1]
      ],
      12: [
        [1, 0],
        [0, -1],
        [1, 0]
      ],
      21: [
        [-1, 0],
        [0, 1],
        [-1, 0]
      ],
      23: [
        [0, 1],
        [1, 0],
        [1, -1]
      ],
      32: [
        [0, -1],
        [-1, 0],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, 1],
        [-1, 2]
      ],
      "03": [
        [1, 0],
        [0, -1],
        [1, -2]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i3_kicks: {
      "01": [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ],
      10: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ],
      12: [
        [1, 0],
        [-1, 0],
        [0, -2],
        [0, 2]
      ],
      21: [
        [-1, 0],
        [1, 0],
        [0, 2],
        [0, -2]
      ],
      23: [
        [-1, 0],
        [1, 0],
        [0, 1],
        [0, -1]
      ],
      32: [
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1]
      ],
      30: [
        [-1, 0],
        [1, 0],
        [0, 0],
        [0, 0]
      ],
      "03": [
        [1, 0],
        [-1, 0],
        [0, 0],
        [0, 0]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    l3_kicks: {
      "01": [
        [-1, 0],
        [1, 0]
      ],
      10: [
        [1, 0],
        [-1, 0]
      ],
      12: [
        [0, -1],
        [0, 1]
      ],
      21: [
        [0, 1],
        [0, -1]
      ],
      23: [
        [1, 0],
        [-1, 0]
      ],
      32: [
        [-1, 0],
        [1, 0]
      ],
      30: [
        [0, 1],
        [0, -1]
      ],
      "03": [
        [0, -1],
        [0, 1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i5_kicks: {
      "01": [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      10: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      12: [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      21: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      23: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      32: [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      30: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      "03": [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    oo_kicks: {
      "01": [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      10: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      12: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      21: [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      23: [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      32: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      "03": [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      "02": [[0, -1]],
      13: [[1, 0]],
      20: [[0, 1]],
      31: [[-1, 0]]
    },
    additional_offsets: {},
    spawn_rotation: {},
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {}
  },
  "SRS-X": {
    kicks: {
      "01": [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      10: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      12: [
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2]
      ],
      21: [
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2]
      ],
      23: [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      32: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      30: [
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2]
      ],
      "03": [
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2]
      ],
      "02": [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [-1, 0],
        [-2, 0],
        [-1, 1],
        [-2, 1],
        [0, -1],
        [3, 0],
        [-3, 0]
      ],
      13: [
        [0, 1],
        [0, 2],
        [-1, 1],
        [-1, 2],
        [0, -1],
        [0, -2],
        [-1, -1],
        [-1, -2],
        [1, 0],
        [0, 3],
        [0, -3]
      ],
      20: [
        [-1, 0],
        [-2, 0],
        [-1, -1],
        [-2, -1],
        [1, 0],
        [2, 0],
        [1, -1],
        [2, -1],
        [0, 1],
        [-3, 0],
        [3, 0]
      ],
      31: [
        [0, 1],
        [0, 2],
        [1, 1],
        [1, 2],
        [0, -1],
        [0, -2],
        [1, -1],
        [1, -2],
        [-1, 0],
        [0, 3],
        [0, -3]
      ]
    },
    i_kicks: {
      "01": [
        [-2, 0],
        [1, 0],
        [-2, 1],
        [1, -2]
      ],
      10: [
        [2, 0],
        [-1, 0],
        [2, -1],
        [-1, 2]
      ],
      12: [
        [-1, 0],
        [2, 0],
        [-1, -2],
        [2, 1]
      ],
      21: [
        [1, 0],
        [-2, 0],
        [1, 2],
        [-2, -1]
      ],
      23: [
        [2, 0],
        [-1, 0],
        [2, -1],
        [-1, 2]
      ],
      32: [
        [-2, 0],
        [1, 0],
        [-2, 1],
        [1, -2]
      ],
      30: [
        [1, 0],
        [-2, 0],
        [1, 2],
        [-2, -1]
      ],
      "03": [
        [-1, 0],
        [2, 0],
        [-1, -2],
        [2, 1]
      ],
      "02": [
        [-1, 0],
        [-2, 0],
        [1, 0],
        [2, 0],
        [0, 1]
      ],
      13: [
        [0, 1],
        [0, 2],
        [0, -1],
        [0, -2],
        [-1, 0]
      ],
      20: [
        [1, 0],
        [2, 0],
        [-1, 0],
        [-2, 0],
        [0, -1]
      ],
      31: [
        [0, 1],
        [0, 2],
        [0, -1],
        [0, -2],
        [1, 0]
      ]
    },
    i2_kicks: {
      "01": [
        [0, -1],
        [-1, 0],
        [-1, -1]
      ],
      10: [
        [0, 1],
        [1, 0],
        [1, 1]
      ],
      12: [
        [1, 0],
        [0, -1],
        [1, 0]
      ],
      21: [
        [-1, 0],
        [0, 1],
        [-1, 0]
      ],
      23: [
        [0, 1],
        [1, 0],
        [1, -1]
      ],
      32: [
        [0, -1],
        [-1, 0],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, 1],
        [-1, 2]
      ],
      "03": [
        [1, 0],
        [0, -1],
        [1, -2]
      ],
      "02": [
        [-1, 0],
        [-2, 0],
        [1, 0],
        [2, 0],
        [0, 1]
      ],
      13: [
        [0, 1],
        [0, 2],
        [0, -1],
        [0, -2],
        [-1, 0]
      ],
      20: [
        [1, 0],
        [2, 0],
        [-1, 0],
        [-2, 0],
        [0, -1]
      ],
      31: [
        [0, 1],
        [0, 2],
        [0, -1],
        [0, -2],
        [1, 0]
      ]
    },
    i3_kicks: {
      "01": [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ],
      10: [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ],
      12: [
        [1, 0],
        [-1, 0],
        [0, -2],
        [0, 2]
      ],
      21: [
        [-1, 0],
        [1, 0],
        [0, 2],
        [0, -2]
      ],
      23: [
        [-1, 0],
        [1, 0],
        [0, 1],
        [0, -1]
      ],
      32: [
        [1, 0],
        [-1, 0],
        [0, -1],
        [0, 1]
      ],
      30: [
        [-1, 0],
        [1, 0],
        [0, 0],
        [0, 0]
      ],
      "03": [
        [1, 0],
        [-1, 0],
        [0, 0],
        [0, 0]
      ],
      "02": [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [-1, 0],
        [-2, 0],
        [-1, 1],
        [-2, 1],
        [0, -1],
        [3, 0],
        [-3, 0]
      ],
      13: [
        [0, 1],
        [0, 2],
        [-1, 1],
        [-1, 2],
        [0, -1],
        [0, -2],
        [-1, -1],
        [-1, -2],
        [1, 0],
        [0, 3],
        [0, -3]
      ],
      20: [
        [-1, 0],
        [-2, 0],
        [-1, -1],
        [-2, -1],
        [1, 0],
        [2, 0],
        [1, -1],
        [2, -1],
        [0, 1],
        [-3, 0],
        [3, 0]
      ],
      31: [
        [0, 1],
        [0, 2],
        [1, 1],
        [1, 2],
        [0, -1],
        [0, -2],
        [1, -1],
        [1, -2],
        [-1, 0],
        [0, 3],
        [0, -3]
      ]
    },
    l3_kicks: {
      "01": [
        [-1, 0],
        [1, 0]
      ],
      10: [
        [1, 0],
        [-1, 0]
      ],
      12: [
        [0, -1],
        [0, 1]
      ],
      21: [
        [0, 1],
        [0, -1]
      ],
      23: [
        [1, 0],
        [-1, 0]
      ],
      32: [
        [-1, 0],
        [1, 0]
      ],
      30: [
        [0, 1],
        [0, -1]
      ],
      "03": [
        [0, -1],
        [0, 1]
      ],
      "02": [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [-1, 0],
        [-2, 0],
        [-1, 1],
        [-2, 1],
        [0, -1],
        [3, 0],
        [-3, 0]
      ],
      13: [
        [0, 1],
        [0, 2],
        [-1, 1],
        [-1, 2],
        [0, -1],
        [0, -2],
        [-1, -1],
        [-1, -2],
        [1, 0],
        [0, 3],
        [0, -3]
      ],
      20: [
        [-1, 0],
        [-2, 0],
        [-1, -1],
        [-2, -1],
        [1, 0],
        [2, 0],
        [1, -1],
        [2, -1],
        [0, 1],
        [-3, 0],
        [3, 0]
      ],
      31: [
        [0, 1],
        [0, 2],
        [1, 1],
        [1, 2],
        [0, -1],
        [0, -2],
        [1, -1],
        [1, -2],
        [-1, 0],
        [0, 3],
        [0, -3]
      ]
    },
    i5_kicks: {
      "01": [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      10: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      12: [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      21: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      23: [
        [2, 0],
        [-2, 0],
        [2, -1],
        [-2, 2]
      ],
      32: [
        [-2, 0],
        [2, 0],
        [-2, 1],
        [2, -2]
      ],
      30: [
        [2, 0],
        [-2, 0],
        [2, 2],
        [-2, -1]
      ],
      "03": [
        [-2, 0],
        [2, 0],
        [-2, -2],
        [2, 1]
      ],
      "02": [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [-1, 0],
        [-2, 0],
        [-1, 1],
        [-2, 1],
        [0, -1],
        [3, 0],
        [-3, 0]
      ],
      13: [
        [0, 1],
        [0, 2],
        [-1, 1],
        [-1, 2],
        [0, -1],
        [0, -2],
        [-1, -1],
        [-1, -2],
        [1, 0],
        [0, 3],
        [0, -3]
      ],
      20: [
        [-1, 0],
        [-2, 0],
        [-1, -1],
        [-2, -1],
        [1, 0],
        [2, 0],
        [1, -1],
        [2, -1],
        [0, 1],
        [-3, 0],
        [3, 0]
      ],
      31: [
        [0, 1],
        [0, 2],
        [1, 1],
        [1, 2],
        [0, -1],
        [0, -2],
        [1, -1],
        [1, -2],
        [-1, 0],
        [0, 3],
        [0, -3]
      ]
    },
    oo_kicks: {
      "01": [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      10: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      12: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      21: [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      23: [
        [0, -1],
        [-1, -1],
        [0, 1],
        [-1, 1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      32: [
        [1, 0],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      30: [
        [-1, 0],
        [0, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [1, -1],
        [1, 1]
      ],
      "03": [
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1],
        [-1, 0],
        [-1, -1],
        [-1, 1]
      ],
      "02": [[0, -1]],
      13: [[1, 0]],
      20: [[0, 1]],
      31: [[-1, 0]]
    },
    additional_offsets: {},
    spawn_rotation: {},
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {}
  },
  "TETRA-X": {
    kicks: {
      "01": [
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
        [0, -1],
        [-1, -1],
        [1, -1]
      ],
      10: [
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, 1],
        [0, -1],
        [1, -1],
        [-1, -1]
      ],
      12: [
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
        [0, -1],
        [-1, -1],
        [1, -1]
      ],
      21: [
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, 1],
        [0, -1],
        [1, -1],
        [-1, -1]
      ],
      23: [
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
        [0, -1],
        [-1, -1],
        [1, -1]
      ],
      32: [
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, 1],
        [0, -1],
        [1, -1],
        [-1, -1]
      ],
      30: [
        [0, 1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
        [0, -1],
        [-1, -1],
        [1, -1]
      ],
      "03": [
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, 1],
        [0, -1],
        [1, -1],
        [-1, -1]
      ],
      "02": [
        [0, 1],
        [0, -1],
        [-1, 0],
        [1, 0]
      ],
      13: [
        [0, 1],
        [0, -1],
        [-1, 0],
        [1, 0]
      ],
      20: [
        [0, 1],
        [0, -1],
        [-1, 0],
        [1, 0]
      ],
      31: [
        [0, 1],
        [0, -1],
        [-1, 0],
        [1, 0]
      ]
    },
    i_kicks: {
      "01": [
        [0, -1],
        [0, -2],
        [0, 1],
        [1, -1],
        [-1, -1],
        [1, -2],
        [-1, -2]
      ],
      10: [
        [0, -1],
        [0, -2],
        [0, 1],
        [-1, 0],
        [1, 0],
        [2, 0]
      ],
      12: [
        [0, -1],
        [0, -2],
        [0, 1],
        [-1, 0],
        [1, 0],
        [2, 0]
      ],
      21: [
        [0, 1],
        [0, 2],
        [0, -1],
        [-1, 1],
        [1, 1],
        [-1, 2],
        [1, 2]
      ],
      23: [
        [0, 1],
        [0, 2],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, 2],
        [-1, 2]
      ],
      32: [
        [0, -1],
        [0, -2],
        [0, 1],
        [1, 0],
        [-1, 0],
        [-2, 0]
      ],
      30: [
        [0, -1],
        [0, -2],
        [0, 1],
        [1, 0],
        [-1, 0],
        [-2, 0]
      ],
      "03": [
        [0, -1],
        [0, -2],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, -2],
        [1, -2]
      ],
      "02": [
        [0, -1],
        [0, 1]
      ],
      13: [
        [0, -1],
        [0, 1]
      ],
      20: [
        [0, -1],
        [0, 1]
      ],
      31: [
        [0, -1],
        [0, 1]
      ]
    },
    additional_offsets: {},
    spawn_rotation: {},
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "o",
      o: "s",
      s: "i",
      i: "l",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {}
  },
  NRS: {
    kicks: {
      "01": [],
      10: [],
      12: [],
      21: [],
      23: [],
      32: [],
      30: [],
      "03": [],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    additional_offsets: {
      z: [
        [1, 1],
        [1, 0],
        [1, 0],
        [2, 0]
      ],
      l: [
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 0]
      ],
      o: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      s: [
        [1, 1],
        [1, 0],
        [1, 0],
        [2, 0]
      ],
      i: [
        [0, 1],
        [0, 0],
        [0, 0],
        [1, 0]
      ],
      j: [
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 0]
      ],
      t: [
        [1, 0],
        [1, 0],
        [1, 0],
        [1, 0]
      ]
    },
    spawn_rotation: { z: 0, l: 2, o: 0, s: 0, i: 0, j: 2, t: 2 },
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {
      l: [
        [0, 0, 201],
        [1, 0, 68],
        [2, 0, 124],
        [0, 1, 31]
      ],
      j: [
        [0, 0, 199],
        [1, 0, 68],
        [2, 0, 114],
        [2, 1, 31]
      ],
      t: [
        [0, 0, 199],
        [1, 0, 74],
        [2, 0, 124],
        [1, 1, 31]
      ]
    }
  },
  ARS: {
    kicks: {
      "01": [
        [1, 0],
        [-1, 0]
      ],
      10: [
        [1, 0],
        [-1, 0]
      ],
      12: [
        [1, 0],
        [-1, 0]
      ],
      21: [
        [1, 0],
        [-1, 0]
      ],
      23: [
        [1, 0],
        [-1, 0]
      ],
      32: [
        [1, 0],
        [-1, 0]
      ],
      30: [
        [1, 0],
        [-1, 0]
      ],
      "03": [
        [1, 0],
        [-1, 0]
      ],
      "02": [
        [1, 0],
        [-1, 0]
      ],
      13: [
        [1, 0],
        [-1, 0]
      ],
      20: [
        [1, 0],
        [-1, 0]
      ],
      31: [
        [1, 0],
        [-1, 0]
      ]
    },
    additional_offsets: {
      i1: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      z: [
        [0, 1],
        [0, 0],
        [0, 0],
        [1, 0]
      ],
      l: [
        [0, 1],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      o: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      s: [
        [0, 1],
        [-1, 0],
        [0, 0],
        [0, 0]
      ],
      i: [
        [0, 0],
        [0, 0],
        [0, -1],
        [1, 0]
      ],
      j: [
        [0, 1],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      t: [
        [0, 1],
        [0, 0],
        [0, 0],
        [0, 0]
      ]
    },
    spawn_rotation: { z: 0, l: 2, o: 0, s: 0, i: 0, j: 2, t: 2 },
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "s",
      l: "l",
      o: "o",
      s: "t",
      i: "z",
      j: "j",
      t: "i",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    preview_overrides: {
      l: [
        [0, 0, 201],
        [1, 0, 68],
        [2, 0, 124],
        [0, 1, 31]
      ],
      j: [
        [0, 0, 199],
        [1, 0, 68],
        [2, 0, 114],
        [2, 1, 31]
      ],
      t: [
        [0, 0, 199],
        [1, 0, 74],
        [2, 0, 124],
        [1, 1, 31]
      ]
    },
    center_column: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1]
    ]
  },
  ASC: {
    kicks: {
      "01": [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      10: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      12: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      21: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      23: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      32: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      30: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      "03": [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    i_kicks: {
      "01": [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      10: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      12: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      21: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      23: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      32: [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      30: [
        [-1, 0],
        [0, 1],
        [-1, 1],
        [0, 2],
        [-1, 2],
        [-2, 0],
        [-2, 1],
        [-2, 2],
        [1, 0],
        [1, 1],
        [0, -1],
        [-1, -1],
        [-2, -1],
        [1, 2],
        [2, 0],
        [0, -2],
        [-1, -2],
        [-2, -2],
        [2, 1],
        [2, 2],
        [1, -1]
      ],
      "03": [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [1, -1],
        [2, -1],
        [-1, 2],
        [-2, 0],
        [0, -2],
        [1, -2],
        [2, -2],
        [-2, 1],
        [-2, 2],
        [-1, -1]
      ],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    allow_o_kick: true,
    additional_offsets: {
      i1: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      z: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      l: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      o: [
        [0, 0],
        [0, 1],
        [-1, 1],
        [-1, 0]
      ],
      s: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      i: [
        [0, 0],
        [0, -1],
        [1, -1],
        [1, 0]
      ],
      j: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ],
      t: [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0]
      ]
    },
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    spawn_rotation: {},
    preview_overrides: {}
  },
  none: {
    kicks: {
      "01": [],
      10: [],
      12: [],
      21: [],
      23: [],
      32: [],
      30: [],
      "03": [],
      "02": [],
      13: [],
      20: [],
      31: []
    },
    additional_offsets: {},
    colorMap: {
      i1: "i",
      i2: "i",
      i3: "i",
      l3: "j",
      i5: "i",
      z: "z",
      l: "l",
      o: "o",
      s: "s",
      i: "i",
      j: "j",
      t: "t",
      oo: "o",
      g: "g",
      d: "d",
      gb: "gb",
      gbd: "gbd"
    },
    spawn_rotation: {},
    preview_overrides: {}
  }
};

// src/engine/utils/kicks/index.ts
var legal = (blocks, board) => {
  if (board.length === 0) return false;
  for (const block of blocks) {
    if (block[0] < 0) return false;
    if (block[0] >= board[0].length) return false;
    if (block[1] < 0) return false;
    if (block[1] >= board.length) return false;
    if (board[block[1]][block[0]]) return false;
  }
  return true;
};
var performKick = (kicktable, piece, pieceLocation, ao, maxMovement, blocks, startRotation, endRotation, board) => {
  try {
    if (legal(
      blocks.map((block) => [
        pieceLocation[0] + block[0] - ao[0],
        Math.floor(pieceLocation[1]) - block[1] - ao[1]
      ]),
      board
    ))
      return true;
    const kickID = `${startRotation}${endRotation}`;
    const table = kicks[kicktable];
    const customKicksetID = `${piece.toLowerCase()}_kicks`;
    const kickset = customKicksetID in table ? table[customKicksetID][kickID] : table.kicks[kickID];
    for (let i = 0; i < kickset.length; i++) {
      const [dx, dy] = kickset[i];
      const newY = maxMovement ? pieceLocation[1] - dy - ao[1] : Math.ceil(pieceLocation[1]) - 0.1 - dy - ao[1];
      if (legal(
        blocks.map((block) => [
          pieceLocation[0] + block[0] + dx - ao[0],
          Math.floor(newY) - block[1]
        ]),
        board
      )) {
        return {
          newLocation: [pieceLocation[0] + dx - ao[0], newY],
          kick: [dx, -dy],
          id: kickID,
          index: i
        };
      }
    }
    return false;
  } catch {
    return false;
  }
};

// src/engine/utils/tetromino/data.ts
var tetrominoes = {
  i1: {
    matrix: {
      w: 1,
      h: 1,
      dx: 0,
      dy: 1,
      data: [[[0, 0, 255]], [[0, 0, 255]], [[0, 0, 255]], [[0, 0, 255]]]
    },
    preview: { w: 1, h: 1, data: [[0, 0, 255]] }
  },
  i2: {
    matrix: {
      w: 2,
      h: 2,
      dx: 0,
      dy: 1,
      data: [
        [
          [0, 0, 199],
          [1, 0, 124]
        ],
        [
          [1, 0, 241],
          [1, 1, 31]
        ],
        [
          [1, 1, 124],
          [0, 1, 199]
        ],
        [
          [0, 1, 31],
          [0, 0, 241]
        ]
      ]
    },
    preview: {
      w: 2,
      h: 1,
      data: [
        [0, 0, 199],
        [1, 0, 124]
      ]
    }
  },
  i3: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [0, 1, 199],
          [1, 1, 68],
          [2, 1, 124]
        ],
        [
          [1, 0, 241],
          [1, 1, 17],
          [1, 2, 31]
        ],
        [
          [2, 1, 124],
          [1, 1, 68],
          [0, 1, 199]
        ],
        [
          [1, 2, 31],
          [1, 1, 17],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 1,
      data: [
        [0, 0, 199],
        [1, 0, 68],
        [2, 0, 124]
      ]
    }
  },
  l3: {
    matrix: {
      w: 2,
      h: 2,
      dx: 0,
      dy: 1,
      data: [
        [
          [0, 0, 241],
          [0, 1, 39],
          [1, 1, 124]
        ],
        [
          [1, 0, 124],
          [0, 0, 201],
          [0, 1, 31]
        ],
        [
          [1, 1, 31],
          [1, 0, 114],
          [0, 0, 199]
        ],
        [
          [0, 1, 199],
          [1, 1, 156],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 2,
      h: 2,
      data: [
        [0, 0, 241],
        [0, 1, 39],
        [1, 1, 124]
      ]
    }
  },
  i5: {
    matrix: {
      w: 5,
      h: 5,
      dx: 2,
      dy: 2,
      data: [
        [
          [0, 2, 199],
          [1, 2, 68],
          [2, 2, 68],
          [3, 2, 68],
          [4, 2, 124]
        ],
        [
          [2, 0, 241],
          [2, 1, 17],
          [2, 2, 17],
          [2, 3, 17],
          [2, 4, 31]
        ],
        [
          [4, 2, 124],
          [3, 2, 68],
          [2, 2, 68],
          [1, 2, 68],
          [0, 2, 199]
        ],
        [
          [2, 4, 31],
          [2, 3, 17],
          [2, 2, 17],
          [2, 1, 17],
          [2, 0, 241]
        ]
      ]
    },
    preview: {
      w: 5,
      h: 1,
      data: [
        [0, 0, 199],
        [1, 0, 68],
        [2, 0, 68],
        [3, 0, 68],
        [4, 0, 124]
      ]
    }
  },
  z: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [0, 0, 199],
          [1, 0, 114],
          [1, 1, 39],
          [2, 1, 124]
        ],
        [
          [2, 0, 241],
          [2, 1, 156],
          [1, 1, 201],
          [1, 2, 31]
        ],
        [
          [2, 2, 124],
          [1, 2, 39],
          [1, 1, 114],
          [0, 1, 199]
        ],
        [
          [0, 2, 31],
          [0, 1, 201],
          [1, 1, 156],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 2,
      data: [
        [0, 0, 199],
        [1, 0, 114],
        [1, 1, 39],
        [2, 1, 124]
      ]
    }
  },
  l: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [2, 0, 241],
          [0, 1, 199],
          [1, 1, 68],
          [2, 1, 156]
        ],
        [
          [2, 2, 124],
          [1, 0, 241],
          [1, 1, 17],
          [1, 2, 39]
        ],
        [
          [0, 2, 31],
          [2, 1, 124],
          [1, 1, 68],
          [0, 1, 201]
        ],
        [
          [0, 0, 199],
          [1, 2, 31],
          [1, 1, 17],
          [1, 0, 114]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 2,
      data: [
        [2, 0, 241],
        [0, 1, 199],
        [1, 1, 68],
        [2, 1, 156]
      ]
    }
  },
  o: {
    matrix: {
      w: 2,
      h: 2,
      dx: 0,
      dy: 1,
      data: [
        [
          [0, 0, 193],
          [1, 0, 112],
          [0, 1, 7],
          [1, 1, 28]
        ],
        [
          [1, 0, 112],
          [1, 1, 28],
          [0, 0, 193],
          [0, 1, 7]
        ],
        [
          [1, 1, 28],
          [0, 1, 7],
          [1, 0, 112],
          [0, 0, 193]
        ],
        [
          [0, 1, 7],
          [0, 0, 193],
          [1, 1, 28],
          [1, 0, 112]
        ]
      ]
    },
    preview: {
      w: 2,
      h: 2,
      data: [
        [0, 0, 193],
        [1, 0, 112],
        [0, 1, 7],
        [1, 1, 28]
      ]
    }
  },
  s: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [1, 0, 201],
          [2, 0, 124],
          [0, 1, 199],
          [1, 1, 156]
        ],
        [
          [2, 1, 114],
          [2, 2, 31],
          [1, 0, 241],
          [1, 1, 39]
        ],
        [
          [1, 2, 156],
          [0, 2, 199],
          [2, 1, 124],
          [1, 1, 201]
        ],
        [
          [0, 1, 39],
          [0, 0, 241],
          [1, 2, 31],
          [1, 1, 114]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 2,
      data: [
        [1, 0, 201],
        [2, 0, 124],
        [0, 1, 199],
        [1, 1, 156]
      ]
    }
  },
  i: {
    matrix: {
      w: 4,
      h: 4,
      dx: 1,
      dy: 1,
      data: [
        [
          [0, 1, 199],
          [1, 1, 68],
          [2, 1, 68],
          [3, 1, 124]
        ],
        [
          [2, 0, 241],
          [2, 1, 17],
          [2, 2, 17],
          [2, 3, 31]
        ],
        [
          [3, 2, 124],
          [2, 2, 68],
          [1, 2, 68],
          [0, 2, 199]
        ],
        [
          [1, 3, 31],
          [1, 2, 17],
          [1, 1, 17],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 4,
      h: 1,
      data: [
        [0, 0, 199],
        [1, 0, 68],
        [2, 0, 68],
        [3, 0, 124]
      ]
    }
  },
  j: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [0, 0, 241],
          [0, 1, 39],
          [1, 1, 68],
          [2, 1, 124]
        ],
        [
          [2, 0, 124],
          [1, 0, 201],
          [1, 1, 17],
          [1, 2, 31]
        ],
        [
          [2, 2, 31],
          [2, 1, 114],
          [1, 1, 68],
          [0, 1, 199]
        ],
        [
          [0, 2, 199],
          [1, 2, 156],
          [1, 1, 17],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 2,
      data: [
        [0, 0, 241],
        [0, 1, 39],
        [1, 1, 68],
        [2, 1, 124]
      ]
    }
  },
  t: {
    matrix: {
      w: 3,
      h: 3,
      dx: 1,
      dy: 1,
      data: [
        [
          [1, 0, 241],
          [0, 1, 199],
          [1, 1, 164],
          [2, 1, 124]
        ],
        [
          [2, 1, 124],
          [1, 0, 241],
          [1, 1, 41],
          [1, 2, 31]
        ],
        [
          [1, 2, 31],
          [2, 1, 124],
          [1, 1, 74],
          [0, 1, 199]
        ],
        [
          [0, 1, 199],
          [1, 2, 31],
          [1, 1, 146],
          [1, 0, 241]
        ]
      ]
    },
    preview: {
      w: 3,
      h: 2,
      data: [
        [1, 0, 241],
        [0, 1, 199],
        [1, 1, 164],
        [2, 1, 124]
      ]
    }
  },
  oo: {
    matrix: {
      w: 4,
      h: 4,
      dx: 1,
      dy: 1,
      data: [
        [
          [0, 1, 193],
          [1, 1, 64],
          [2, 1, 64],
          [3, 1, 112],
          [0, 2, 7],
          [1, 2, 4],
          [2, 2, 4],
          [3, 2, 28]
        ],
        [
          [2, 0, 112],
          [2, 1, 16],
          [2, 2, 16],
          [2, 3, 28],
          [1, 0, 193],
          [1, 1, 1],
          [1, 2, 1],
          [1, 3, 7]
        ],
        [
          [3, 2, 28],
          [2, 2, 68],
          [1, 2, 68],
          [0, 2, 7],
          [3, 1, 112],
          [2, 1, 64],
          [1, 1, 64],
          [0, 1, 193]
        ],
        [
          [1, 3, 7],
          [1, 2, 1],
          [1, 1, 1],
          [1, 0, 193],
          [2, 3, 28],
          [2, 2, 16],
          [2, 1, 16],
          [2, 0, 112]
        ]
      ]
    },
    preview: {
      w: 4,
      h: 2,
      data: [
        [0, 0, 193],
        [1, 0, 64],
        [2, 0, 64],
        [3, 0, 112],
        [0, 1, 7],
        [1, 1, 4],
        [2, 1, 4],
        [3, 1, 28]
      ]
    },
    xweight: 1
  }
};

// src/engine/utils/tetromino/index.ts
var Tetromino = class {
  _rotation;
  symbol;
  states;
  location;
  locking;
  lockResets;
  rotResets;
  safeLock;
  highestY;
  fallingRotations;
  totalRotations;
  irs;
  ihs;
  aox;
  aoy;
  keys;
  constructor(options) {
    this.rotation = options.initialRotation;
    this.symbol = options.symbol;
    const tetromino = tetrominoes[this.symbol.toLowerCase()];
    this.states = tetromino.matrix.data;
    this.location = [
      Math.floor(options.boardWidth / 2 - tetromino.matrix.w / 2),
      options.boardHeight + 2.04
    ];
    this.locking = 0;
    this.lockResets = 0;
    this.rotResets = 0;
    this.safeLock = options.from?.safeLock ?? 0;
    this.highestY = options.boardHeight + 2;
    this.fallingRotations = 0;
    this.totalRotations = 0;
    this.irs = options.from?.irs ?? 0;
    this.ihs = options.from?.ihs ?? false;
    this.aox = 0;
    this.aoy = 0;
    this.keys = 0;
  }
  get blocks() {
    return this.states[Math.min(this.rotation, this.states.length)];
  }
  get absoluteBlocks() {
    return this.blocks.map((block) => [
      block[0] + this.location[0],
      -block[1] + this.y
    ]);
  }
  absoluteAt({
    x = this.location[0],
    y = this.location[1],
    rotation = this.rotation
  }) {
    const currentState = [this.location[0], this.location[1], this.rotation];
    this.location = [x, y];
    this.rotation = rotation;
    const res = this.absoluteBlocks;
    this.location = [currentState[0], currentState[1]];
    this.rotation = currentState[2];
    return res;
  }
  get rotation() {
    return this._rotation % 4;
  }
  set rotation(value) {
    this._rotation = value % 4;
  }
  get x() {
    return this.location[0];
  }
  set x(value) {
    this.location[0] = value;
  }
  get y() {
    return Math.floor(this.location[1]);
  }
  set y(value) {
    this.location[1] = value;
  }
  isStupidSpinPosition(board) {
    return !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0],
        -block[1] + this.y - 1
      ]),
      board
    );
  }
  isAllSpinPosition(board) {
    return !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0] - 1,
        -block[1] + this.y
      ]),
      board
    ) && !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0] + 1,
        -block[1] + this.y
      ]),
      board
    ) && !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0],
        -block[1] + this.y + 1
      ]),
      board
    ) && !legal(
      this.blocks.map((block) => [
        block[0] + this.location[0],
        -block[1] + this.y - 1
      ]),
      board
    );
  }
  rotate(board, kickTable, amt, maxMovement) {
    const rotatedBlocks = this.states[(this.rotation + amt) % 4];
    const kickRes = performKick(
      kickTable,
      this.symbol,
      this.location,
      [this.aox, this.aoy],
      maxMovement,
      rotatedBlocks,
      this.rotation,
      (this.rotation + amt) % 4,
      board
    );
    if (typeof kickRes === "object") {
      this.location = [...kickRes.newLocation];
    }
    if (kickRes) {
      this.rotation = this.rotation + amt;
      return kickRes;
    }
    return false;
  }
  moveRight(board) {
    if (legal(
      this.blocks.map((block) => [
        block[0] + this.location[0] + 1,
        -block[1] + this.y
      ]),
      board
    )) {
      this.location[0]++;
      return true;
    }
    return false;
  }
  moveLeft(board) {
    if (legal(
      this.blocks.map((block) => [
        block[0] + this.location[0] - 1,
        -block[1] + this.y
      ]),
      board
    )) {
      this.location[0]--;
      return true;
    }
    return false;
  }
  dasRight(board) {
    if (this.moveRight(board)) {
      while (this.moveRight(board)) {
      }
      return true;
    }
    return false;
  }
  dasLeft(board) {
    if (this.moveLeft(board)) {
      while (this.moveLeft(board)) {
      }
      return true;
    }
    return false;
  }
  softDrop(board) {
    const start = this.location[1];
    while (legal(
      this.blocks.map((block) => [
        block[0] + this.location[0],
        -block[1] + this.y - 1
      ]),
      board
    )) {
      this.location[1]--;
    }
    return start !== this.location[1];
  }
  snapshot() {
    return {
      aox: this.aox,
      aoy: this.aoy,
      fallingRotations: this.fallingRotations,
      highestY: this.highestY,
      ihs: this.ihs,
      irs: this.irs,
      keys: this.keys,
      rotation: this.rotation,
      location: deepCopy(this.location),
      locking: this.locking,
      lockResets: this.lockResets,
      rotResets: this.rotResets,
      safeLock: this.safeLock,
      symbol: this.symbol,
      totalRotations: this.totalRotations
    };
  }
};

// src/engine/utils/seed.ts
var randomSeed = () => Math.floor(Math.random() * 2147483646);

// src/engine/utils/polyfills/index.ts
var polyfills;
((polyfills2) => {
  class Map2 {
    _entries = [];
    constructor(iterable) {
      if (iterable) {
        for (const [key, value] of iterable) {
          this.set(key, value);
        }
      }
    }
    get size() {
      return this._entries.length;
    }
    set = (key, value) => {
      const index = this._entries.findIndex(([k]) => k === key);
      if (index !== -1) {
        this._entries[index][1] = value;
      } else {
        this._entries.push([key, value]);
      }
      return this;
    };
    get = (key) => {
      const entry = this._entries.find(([k]) => k === key);
      return entry ? entry[1] : void 0;
    };
    has = (key) => {
      return this._entries.some(([k]) => k === key);
    };
    delete = (key) => {
      const index = this._entries.findIndex(([k]) => k === key);
      if (index !== -1) {
        this._entries.splice(index, 1);
        return true;
      }
      return false;
    };
    clear = () => {
      this._entries = [];
    };
    forEach = (callback, thisArg) => {
      const entriesCopy = this._entries.slice();
      for (const [key, value] of entriesCopy) {
        callback.call(thisArg, value, key, this);
      }
    };
    *entries() {
      for (const entry of this._entries) {
        yield entry;
      }
    }
    *keys() {
      for (const [key] of this._entries) {
        yield key;
      }
    }
    *values() {
      for (const [, value] of this._entries) {
        yield value;
      }
    }
    [Symbol.iterator] = function* () {
      yield* this.entries();
    };
  }
  polyfills2.Map = Map2;
})(polyfills || (polyfills = {}));

// src/engine/utils/rng/index.ts
var RNG = class _RNG {
  static MODULUS = 2147483647;
  static MULTIPLIER = 16807;
  static MAX_FLOAT = 2147483646;
  value;
  index = 0;
  constructor(seed) {
    this.value = seed % _RNG.MODULUS;
    if (this.value <= 0) {
      this.value += _RNG.MAX_FLOAT;
    }
    this.next = this.next.bind(this);
    this.nextFloat = this.nextFloat.bind(this);
    this.shuffleArray = this.shuffleArray.bind(this);
    this.updateFromIndex = this.updateFromIndex.bind(this);
    this.clone = this.clone.bind(this);
  }
  next() {
    this.index++;
    return this.value = _RNG.MULTIPLIER * this.value % _RNG.MODULUS;
  }
  nextFloat() {
    return (this.next() - 1) / _RNG.MAX_FLOAT;
  }
  shuffleArray(array) {
    if (array.length === 0) {
      return array;
    }
    for (let i = array.length - 1; i !== 0; i--) {
      const r = Math.floor(this.nextFloat() * (i + 1));
      [array[i], array[r]] = [array[r], array[i]];
    }
    return array;
  }
  get seed() {
    return this.value;
  }
  set seed(value) {
    this.value = value % _RNG.MODULUS;
    if (this.value <= 0) {
      this.value += _RNG.MAX_FLOAT;
    }
  }
  updateFromIndex(index) {
    while (this.index < index) {
      this.next();
    }
  }
  clone() {
    return new _RNG(this.value);
  }
};

// src/engine/utils/index.ts
function deepCopy(obj, handlers = []) {
  if (obj === null || obj === void 0 || typeof obj !== "object") {
    return obj;
  }
  for (const h of handlers) {
    if (obj instanceof h.type) {
      return h.copy(obj);
    }
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item, handlers));
  }
  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = deepCopy(obj[key], handlers);
  }
  return out;
}

// src/engine/garbage/legacy.ts
var columnWidth = (width, garbageHoleSize) => {
  return Math.max(0, width - (garbageHoleSize - 1));
};
var LegacyGarbageQueue = class {
  options;
  queue;
  lastTankTime = 0;
  lastColumn = null;
  rng;
  // for opener phase calculations
  sent = 0;
  constructor(options) {
    this.options = deepCopy(options);
    if (!this.options.cap.absolute)
      this.options.cap.absolute = Number.MAX_SAFE_INTEGER;
    this.queue = [];
    this.rng = new RNG(this.options.seed);
  }
  snapshot() {
    return {
      seed: this.rng.seed,
      lastTankTime: this.lastTankTime,
      lastColumn: this.lastColumn,
      sent: this.sent,
      queue: deepCopy(this.queue),
      hasChangedColumn: false,
      lastReceivedCount: 0
    };
  }
  fromSnapshot(snapshot) {
    this.queue = deepCopy(snapshot.queue);
    this.lastTankTime = snapshot.lastTankTime;
    this.lastColumn = snapshot.lastColumn;
    this.rng = new RNG(snapshot.seed);
    this.sent = snapshot.sent;
  }
  rngex() {
    return this.rng.nextFloat();
  }
  get size() {
    return this.queue.reduce((a, b) => a + b.amount, 0);
  }
  receive(...args) {
    this.queue.push(...args.filter((arg) => arg.amount > 0));
    while (this.size > this.options.cap.absolute) {
      const total = this.size;
      if (this.queue.at(-1).amount <= total - this.options.cap.absolute) {
        this.queue.pop();
      } else {
        this.queue.at(-1).amount -= total - this.options.cap.absolute;
      }
    }
  }
  confirm(cid, gameid, frame) {
    const obj = this.queue.find((g) => g.cid === cid && g.gameid === gameid);
    if (!obj) return false;
    obj.frame = frame;
    obj.confirmed = true;
    return true;
  }
  cancel(amount, pieceCount, legacy = {}) {
    let send = amount, cancel = 0;
    let cancelled = [];
    if (pieceCount + 1 <= this.options.openerPhase - (legacy.openerPhase ? 1 : 0) && this.size >= this.sent)
      cancel += amount;
    while ((send > 0 || cancel > 0) && this.size > 0) {
      this.queue[0].amount--;
      if (cancelled.length === 0 || cancelled[cancelled.length - 1].cid !== this.queue[0].cid) {
        cancelled.push({ ...this.queue[0], amount: 1 });
      } else {
        cancelled[cancelled.length - 1].amount++;
      }
      if (this.queue[0].amount <= 0) this.queue.shift();
      if (send > 0) send--;
      else cancel--;
    }
    this.sent += send;
    return [send, cancelled];
  }
  /**
   * This function does NOT take into account messiness on timeout.
   * The first garbage hole will be correct,
   * but subsequent holes depend on whether or not garbage is cancelled.
   */
  predict() {
    const rng = this.rng.clone();
    const rngex = rng.nextFloat.bind(rng);
    let lastColumn = this.lastColumn;
    const reroll = () => {
      lastColumn = this.#__internal_rerollColumn(lastColumn, rngex);
      return lastColumn;
    };
    const result = this.#__internal_tank(
      deepCopy(this.queue),
      () => lastColumn,
      rngex,
      reroll,
      -Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      false
    );
    return result.res;
  }
  get nextColumn() {
    const rng = this.rng.clone();
    if (this.lastColumn === null)
      return this.#__internal_rerollColumn(null, rng.nextFloat.bind(rng));
    return this.lastColumn;
  }
  #__internal_rerollColumn(current, rngex) {
    let col;
    const cols = columnWidth(
      this.options.boardWidth,
      this.options.garbage.holeSize
    );
    if (this.options.messiness.nosame && current !== null) {
      col = Math.floor(rngex() * (cols - 1));
      if (col >= current) col++;
    } else {
      col = Math.floor(rngex() * cols);
    }
    return col;
  }
  #rerollColumn() {
    const col = this.#__internal_rerollColumn(
      this.lastColumn,
      this.rngex.bind(this)
    );
    this.lastColumn = col;
    return col;
  }
  #__internal_tank(queue, lastColumn, rngex, reroll, frame, cap, hard) {
    if (queue.length === 0) return { res: [], lastColumn, queue };
    const res = [];
    queue = queue.sort((a, b) => a.frame - b.frame);
    if (this.options.messiness.timeout && frame >= this.lastTankTime + this.options.messiness.timeout) {
      reroll();
      this.lastTankTime = frame;
    }
    let total = 0;
    while (total < cap && queue.length > 0) {
      const item = deepCopy(queue[0]);
      if (item.frame + this.options.garbage.speed > (hard ? frame : frame - 1))
        break;
      total += item.amount;
      let exausted = false;
      if (total > cap) {
        const excess = total - cap;
        queue[0].amount = excess;
        item.amount -= excess;
      } else {
        queue.shift();
        exausted = true;
      }
      for (let i = 0; i < item.amount; i++) {
        const r = lastColumn() === null || rngex() < this.options.messiness.within;
        res.push({
          ...item,
          id: item.cid,
          amount: 1,
          column: r ? reroll() : lastColumn()
        });
      }
      if (exausted && rngex() < this.options.messiness.change) {
        reroll();
      }
    }
    return {
      res,
      queue
    };
  }
  tank(frame, cap, hard) {
    const { res, queue } = this.#__internal_tank(
      this.queue,
      () => this.lastColumn,
      this.rngex.bind(this),
      this.#rerollColumn.bind(this),
      frame,
      cap,
      hard
    );
    this.queue = queue;
    return res.map((v) => ({ ...v, bombs: this.options.bombs }));
  }
  round(amount) {
    switch (this.options.rounding) {
      case "down":
        return Math.floor(amount);
      case "rng":
        const floored = Math.floor(amount);
        if (floored === amount) return floored;
        const decimal = amount - floored;
        return floored + (this.rngex() < decimal ? 1 : 0);
      default:
        throw new Error(`Invalid rounding mode ${this.options.rounding}`);
    }
  }
};

// src/engine/garbage/index.ts
var GarbageQueue = class {
  options;
  queue;
  lastTankTime = 0;
  lastColumn = null;
  hasChangedColumn = false;
  lastReceivedCount = 0;
  rng;
  // for opener phase calculations
  sent = 0;
  constructor(options) {
    this.options = deepCopy(options);
    if (!this.options.cap.absolute)
      this.options.cap.absolute = Number.MAX_SAFE_INTEGER;
    this.queue = [];
    this.rng = new RNG(this.options.seed);
  }
  snapshot() {
    return {
      seed: this.rng.seed,
      lastTankTime: this.lastTankTime,
      lastColumn: this.lastColumn,
      sent: this.sent,
      hasChangedColumn: this.hasChangedColumn,
      lastReceivedCount: this.lastReceivedCount,
      queue: deepCopy(this.queue)
    };
  }
  fromSnapshot(snapshot) {
    this.queue = deepCopy(snapshot.queue);
    this.lastTankTime = snapshot.lastTankTime;
    this.lastColumn = snapshot.lastColumn;
    this.rng = new RNG(snapshot.seed);
    this.sent = snapshot.sent;
    this.hasChangedColumn = snapshot.hasChangedColumn;
    this.lastReceivedCount = snapshot.lastReceivedCount;
  }
  rngex() {
    return this.rng.nextFloat();
  }
  get size() {
    return this.queue.reduce((a, b) => a + b.amount, 0);
  }
  resetReceivedCount() {
    this.lastReceivedCount = 0;
  }
  receive(...args) {
    this.queue.push(...args.filter((arg) => arg.amount > 0));
    while (this.size > this.options.cap.absolute) {
      const total = this.size;
      if (this.queue.at(-1).amount <= total - this.options.cap.absolute) {
        this.queue.pop();
      } else {
        this.queue.at(-1).amount -= total - this.options.cap.absolute;
      }
    }
  }
  confirm(cid, gameid, frame) {
    const obj = this.queue.find((g) => g.cid === cid && g.gameid === gameid);
    if (!obj) return false;
    obj.frame = frame;
    obj.confirmed = true;
    return true;
  }
  cancel(amount, pieceCount, legacy = {}) {
    let send = amount, cancel = 0;
    let cancelled = [];
    if (pieceCount + 1 <= this.options.openerPhase - (legacy.openerPhase ? 1 : 0) && this.size >= this.sent)
      cancel += amount;
    while ((send > 0 || cancel > 0) && this.size > 0) {
      this.queue[0].amount--;
      if (cancelled.length === 0 || cancelled[cancelled.length - 1].cid !== this.queue[0].cid) {
        cancelled.push({ ...this.queue[0], amount: 1 });
      } else {
        cancelled[cancelled.length - 1].amount++;
      }
      if (this.queue[0].amount <= 0) {
        this.queue.shift();
        if (this.rngex() < this.options.messiness.change) {
          this.#reroll_column();
          this.hasChangedColumn = true;
        }
      }
      if (send > 0) send--;
      else cancel--;
    }
    this.sent += send;
    return [send, cancelled];
  }
  get #columnWidth() {
    return Math.max(
      0,
      this.options.boardWidth - (this.options.garbage.holeSize - 1)
    );
  }
  #reroll_column() {
    const centerBuffer = this.options.messiness.center ? Math.round(this.options.boardWidth / 5) : 0;
    let col;
    if (this.options.messiness.nosame && this.lastColumn !== null) {
      col = centerBuffer + Math.floor(this.rngex() * (this.#columnWidth - 1 - 2 * centerBuffer));
      if (col >= this.lastColumn) col++;
    } else {
      col = centerBuffer + Math.floor(this.rngex() * (this.#columnWidth - 2 * centerBuffer));
    }
    this.lastColumn = col;
    return col;
  }
  tank(frame, cap, hard) {
    if (this.queue.length === 0) return [];
    const res = [];
    this.queue = this.queue.sort((a, b) => a.frame - b.frame);
    if (this.options.messiness.timeout && frame >= this.lastTankTime + this.options.messiness.timeout) {
      this.#reroll_column();
      this.hasChangedColumn = true;
    }
    const tankAll = false;
    const lines = tankAll ? 400 : Math.floor(Math.min(cap, this.options.cap.max));
    for (let i = 0; i < lines && this.queue.length !== 0; i++) {
      const item = this.queue[0];
      if (item.frame + this.options.garbage.speed > (hard ? frame : frame - 1))
        break;
      item.amount--;
      this.lastReceivedCount++;
      let col = this.lastColumn;
      if ((col === null || this.rngex() < this.options.messiness.within) && !this.hasChangedColumn) {
        col = this.#reroll_column();
        this.hasChangedColumn = true;
      }
      res.push({
        ...item,
        amount: 1,
        column: col,
        id: item.cid
      });
      this.hasChangedColumn = false;
      if (item.amount <= 0) {
        this.queue.shift();
        if (this.rngex() < this.options.messiness.change) {
          this.#reroll_column();
          this.hasChangedColumn = true;
        }
      }
    }
    return res;
  }
  round(amount) {
    switch (this.options.rounding) {
      case "down":
        return Math.floor(amount);
      case "rng":
        const floored = Math.floor(amount);
        if (floored === amount) return floored;
        const decimal = amount - floored;
        return floored + (this.rngex() < decimal ? 1 : 0);
      default:
        throw new Error(`Invalid rounding mode ${this.options.rounding}`);
    }
  }
};

// src/engine/multiplayer/ige.ts
var IGEHandler = class {
  /** @hidden */
  players;
  /** @hidden */
  iid = 0;
  /** @hidden */
  extract(data) {
    return JSON.parse(data);
  }
  /** @hidden */
  stringify(data) {
    return JSON.stringify(data);
  }
  /**
   * Manages network IGE cancelling
   * @param players - list of player ids
   */
  constructor(players) {
    this.players = new polyfills.Map();
    players.forEach((player) => {
      this.players.set(player, this.stringify({ incoming: 0, outgoing: [] }));
    });
  }
  /**
   * Sends a message to a player.
   * @param options - info on sending player
   * @param options.playerID - The ID of the player to send the message to.
   * @param options.amount - The amount of the message.
   * @throws {Error} If the player is not found.
   */
  send({ playerID, amount }) {
    if (amount === 0) return;
    const player = this.players.get(playerID);
    const iid = ++this.iid;
    if (!player)
      throw new Error(
        `player not found: player with id ${playerID} not in ${[
          ...this.players.keys()
        ].join(", ")}`
      );
    this.players.set(
      playerID,
      JSON.stringify({
        incoming: JSON.parse(player).incoming,
        outgoing: [...this.extract(player).outgoing, { iid, amount }]
      })
    );
  }
  /**
   * Receives a garbage from a player and processes it.
   * @param garbage - garbage object of data
   * @param garbage.playerID - The ID of the player sending the garbage.
   * @param garbage.ackiid - The IID of the last acknowledged item.
   * @param garbage.iid - The IID of the incoming item.
   * @param garbage.amount - The amount of the incoming item.
   * @returns The remaining amount after processing the message.
   * @throws {Error} If the player is not found.
   */
  receive({
    playerID,
    ackiid,
    iid,
    amount
  }) {
    const player = this.players.get(playerID);
    if (!player)
      throw new Error(
        `player not found: player with id ${playerID} not in ${[
          ...this.players.keys()
        ].join(", ")}`
      );
    const p = this.extract(player);
    const incomingIID = Math.max(iid, p.incoming ?? 0);
    const newIGEs = [];
    let runningAmount = amount;
    p.outgoing.forEach((item) => {
      if (item.iid <= ackiid) return;
      const amt = Math.min(item.amount, runningAmount);
      item.amount -= amt;
      runningAmount -= amt;
      if (item.amount > 0) newIGEs.push(item);
    });
    this.players.set(
      playerID,
      this.stringify({ incoming: incomingIID, outgoing: newIGEs })
    );
    return runningAmount;
  }
  snapshot() {
    return {
      players: Object.fromEntries(this.players.entries()),
      iid: this.iid
    };
  }
  fromSnapshot(snapshot) {
    this.players = new polyfills.Map(
      Object.entries(snapshot.players).map(([k, v]) => [Number(k), v])
    );
    this.iid = snapshot.iid;
  }
};

// src/engine/queue/rng/bag7.ts
var bag7 = (seed) => {
  const gen = new RNG(seed);
  return () => gen.shuffleArray(["z", "l", "o", "s", "i", "j", "t"]);
};

// src/engine/queue/rng/bag7-1.ts
var bag7_1 = (seed) => {
  const gen = new RNG(seed);
  return () => gen.shuffleArray([
    "z" /* Z */,
    "l" /* L */,
    "o" /* O */,
    "s" /* S */,
    "i" /* I */,
    "j" /* J */,
    "t" /* T */,
    ["z" /* Z */, "l" /* L */, "o" /* O */, "s" /* S */, "i" /* I */, "j" /* J */, "t" /* T */][Math.floor(gen.nextFloat() * 7)]
  ]);
};

// src/engine/queue/rng/bag7-2.ts
var bag7_2 = (seed) => {
  const gen = new RNG(seed);
  return () => gen.shuffleArray([
    "z" /* Z */,
    "l" /* L */,
    "o" /* O */,
    "s" /* S */,
    "i" /* I */,
    "j" /* J */,
    "t" /* T */,
    ["z" /* Z */, "l" /* L */, "o" /* O */, "s" /* S */, "i" /* I */, "j" /* J */, "t" /* T */][Math.floor(gen.nextFloat() * 7)],
    ["z" /* Z */, "l" /* L */, "o" /* O */, "s" /* S */, "i" /* I */, "j" /* J */, "t" /* T */][Math.floor(gen.nextFloat() * 7)]
  ]);
};

// src/engine/queue/rng/bag7-x.ts
var bag7_X = (seed) => {
  const gen = new RNG(seed);
  const extraPieceCount = [3, 2, 1, 1];
  let bagid = 0;
  let extraBag = [];
  return () => {
    const extra = extraPieceCount[bagid++] ?? 0;
    if (extraBag.length < extra)
      extraBag = gen.shuffleArray([
        "z" /* Z */,
        "l" /* L */,
        "o" /* O */,
        "s" /* S */,
        "i" /* I */,
        "j" /* J */,
        "t" /* T */
      ]);
    return gen.shuffleArray([
      "z" /* Z */,
      "l" /* L */,
      "o" /* O */,
      "s" /* S */,
      "i" /* I */,
      "j" /* J */,
      "t" /* T */,
      ...extraBag.splice(0, extra)
    ]);
  };
};

// src/engine/queue/rng/bag14.ts
var bag14 = (seed) => {
  const gen = new RNG(seed);
  return () => gen.shuffleArray([
    "z",
    "l",
    "o",
    "s",
    "i",
    "j",
    "t",
    "z",
    "l",
    "o",
    "s",
    "i",
    "j",
    "t"
  ]);
};

// src/engine/queue/rng/classic.ts
var classic = (seed) => {
  const TETROMINOS = [
    "z" /* Z */,
    "l" /* L */,
    "o" /* O */,
    "s" /* S */,
    "i" /* I */,
    "j" /* J */,
    "t" /* T */
  ];
  let lastGenerated = null;
  const gen = new RNG(seed);
  return () => {
    let index = Math.floor(gen.nextFloat() * (TETROMINOS.length + 1));
    if (index === lastGenerated || index >= TETROMINOS.length) {
      index = Math.floor(gen.nextFloat() * TETROMINOS.length);
    }
    lastGenerated = index;
    return [TETROMINOS[index]];
  };
};

// src/engine/queue/rng/pairs.ts
var pairs = (seed) => {
  const gen = new RNG(seed);
  return () => {
    const s = gen.shuffleArray(["z", "l", "o", "s", "i", "j", "t"]);
    const pairs2 = gen.shuffleArray([s[0], s[0], s[0], s[1], s[1], s[1]]);
    return pairs2;
  };
};

// src/engine/queue/rng/random.ts
var random = (seed) => {
  const gen = new RNG(seed);
  return () => {
    const TETROMINOS = [
      "z" /* Z */,
      "l" /* L */,
      "o" /* O */,
      "s" /* S */,
      "i" /* I */,
      "j" /* J */,
      "t" /* T */
    ];
    return [TETROMINOS[Math.floor(gen.nextFloat() * TETROMINOS.length)]];
  };
};

// src/engine/queue/rng/index.ts
var rngMap = {
  "7-bag": bag7,
  "14-bag": bag14,
  classic,
  pairs,
  "total mayhem": random,
  "7+1-bag": bag7_1,
  "7+2-bag": bag7_2,
  "7+x-bag": bag7_X
};

// src/engine/queue/index.ts
var Queue = class {
  seed;
  type;
  genFunction;
  value;
  _minLength;
  index;
  repopulateListener = null;
  constructor(options) {
    this.seed = options.seed;
    this.type = options.type;
    this.reset();
    this.value = [];
    this.minLength = options.minLength;
    this.index = 0;
  }
  reset(index = 0) {
    this.genFunction = rngMap[this.type](this.seed);
    this.value = [];
    this.index = 0;
    this.repopulate();
    for (let i = 0; i < index; i++) {
      this.shift();
      this.repopulate();
    }
  }
  onRepopulate(listener) {
    this.repopulateListener = listener;
  }
  get minLength() {
    return this._minLength;
  }
  set minLength(val) {
    this._minLength = val;
    this.repopulate();
  }
  get next() {
    return this.value[0];
  }
  at(index) {
    return this.value.at(index);
  }
  shift() {
    const val = this.value.shift();
    this.index++;
    this.repopulate();
    return val;
  }
  repopulate() {
    const added = [];
    while (this.value.length < this.minLength) {
      const newValues = this.genFunction();
      this.value.push(...newValues);
      added.push(...newValues);
    }
    if (this.repopulateListener) {
      this.repopulateListener(added);
    }
  }
};

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/browser.js
var level = (() => {
  if (!("navigator" in globalThis)) {
    return 0;
  }
  if (globalThis.navigator.userAgentData) {
    const brand = navigator.userAgentData.brands.find(({ brand: brand2 }) => brand2 === "Chromium");
    if (brand && brand.version > 93) {
      return 3;
    }
  }
  if (/\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent)) {
    return 1;
  }
  return 0;
})();
var colorSupport = level !== 0 && {
  level,
  hasBasic: true,
  has256: level >= 2,
  has16m: level >= 3
};
var supportsColor = {
  stdout: colorSupport,
  stderr: colorSupport
};
var browser_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = browser_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = /* @__PURE__ */ Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level2, type, ...arguments_) => {
  if (model === "rgb") {
    if (level2 === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level2 === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level2, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level: level2 } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level2], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {
}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level2) {
      this[GENERATOR].level = level2;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/engine/index.ts
var Engine = class _Engine {
  queue;
  held;
  holdLocked;
  falling;
  _kickTable;
  board;
  lastSpin;
  lastWasClear;
  stats;
  gameOptions;
  garbageQueue;
  frame;
  subframe;
  initializer;
  handling;
  input;
  pc;
  b2b;
  dynamic;
  glock;
  multiplayer;
  igeHandler;
  misc;
  state;
  events = new EventEmitter();
  resCache;
  constructor(options) {
    this.initializer = deepCopy(options, [
      { type: Date, copy: (d) => new Date(d) }
    ]);
    this.init();
  }
  init() {
    const options = this.initializer;
    this.queue = new Queue(options.queue);
    this.queue.onRepopulate(this.#onQueueRepopulate.bind(this));
    this._kickTable = options.kickTable;
    this.board = new Board(options.board);
    this.garbageQueue = new ((options.misc.date ?? /* @__PURE__ */ new Date()) > /* @__PURE__ */ new Date("2025-05-06T15:00:00-04:00") ? GarbageQueue : LegacyGarbageQueue)(options.garbage);
    this.igeHandler = new IGEHandler(options.multiplayer?.opponents || []);
    if (options.multiplayer)
      this.multiplayer = {
        options: options.multiplayer,
        targets: [],
        passthrough: {
          network: ["consistent", "zero"].includes(
            options.multiplayer.passthrough
          ),
          replay: options.multiplayer.passthrough !== "full",
          travel: ["zero", "limited"].includes(options.multiplayer.passthrough)
        }
      };
    this.held = null;
    this.holdLocked = false;
    this.lastSpin = null;
    this.lastWasClear = false;
    this.stats = {
      combo: -1,
      b2b: -1,
      pieces: 0,
      lines: 0,
      garbage: {
        sent: 0,
        attack: 0,
        receive: 0,
        cleared: 0
      }
    };
    this.pc = options.pc;
    this.b2b = {
      chaining: options.b2b.chaining,
      charging: options.b2b.charging
    };
    this.dynamic = {
      gravity: new IncreaseTracker(
        options.gravity.value,
        options.gravity.increase,
        options.gravity.marginTime
      ),
      garbageMultiplier: new IncreaseTracker(
        options.garbage.multiplier.value,
        options.garbage.multiplier.increase,
        options.garbage.multiplier.marginTime
      ),
      garbageCap: new IncreaseTracker(
        options.garbage.cap.value,
        options.garbage.cap.increase,
        options.garbage.cap.marginTime
      )
    };
    this.glock = 0;
    this.misc = options.misc;
    this.gameOptions = options.options;
    this.handling = options.handling;
    this.input = {
      lShift: { held: false, arr: 0, das: 0, dir: -1 },
      rShift: { held: false, arr: 0, das: 0, dir: 1 },
      lastShift: -1,
      firstInputTime: -1,
      time: { start: 0, zero: true, locked: false, prev: 0, frameoffset: 0 },
      lastPieceTime: 0,
      keys: {
        softDrop: false,
        hold: false,
        rotateCW: false,
        rotateCCW: false,
        rotate180: false
      }
    };
    this.frame = 0;
    this.subframe = 0;
    this.state = 0;
    this.flushRes();
    this.nextPiece();
    this.bindAll();
  }
  flushRes() {
    const res = this.resCache ? deepCopy(this.resCache) : null;
    this.resCache = {
      pieces: 0,
      garbage: {
        sent: [],
        received: []
      },
      keys: [],
      lastLock: 0
    };
    return res;
  }
  reset() {
    this.init();
  }
  bindAll() {
    this.moveRight = this.moveRight.bind(this);
    this.moveLeft = this.moveLeft.bind(this);
    this.dasRight = this.dasRight.bind(this);
    this.dasLeft = this.dasLeft.bind(this);
    this.softDrop = this.softDrop.bind(this);
    this.hardDrop = this.hardDrop.bind(this);
    this.hold = this.hold.bind(this);
    this.rotateCW = this.rotateCW.bind(this);
    this.rotateCCW = this.rotateCCW.bind(this);
    this.rotate180 = this.rotate180.bind(this);
    this.snapshot = this.snapshot.bind(this);
    this.fromSnapshot = this.fromSnapshot.bind(this);
    this.nextPiece = this.nextPiece.bind(this);
  }
  #onQueueRepopulate(pieces) {
    this.events.emit("queue.add", pieces);
  }
  snapshot() {
    return {
      board: deepCopy(this.board.state),
      falling: this.falling.snapshot(),
      frame: this.frame,
      garbage: this.garbageQueue.snapshot(),
      hold: this.held,
      holdLocked: this.holdLocked,
      lastSpin: deepCopy(this.lastSpin),
      lastWasClear: this.lastWasClear,
      queue: this.queue.index,
      input: deepCopy(this.input),
      subframe: this.subframe,
      targets: this.multiplayer?.targets,
      stats: deepCopy(this.stats),
      glock: this.glock,
      ige: this.igeHandler.snapshot(),
      state: this.state,
      resCache: deepCopy(this.resCache)
    };
  }
  fromSnapshot(snapshot) {
    this.board.state = deepCopy(snapshot.board);
    this.falling = new Tetromino({
      boardHeight: this.board.height,
      boardWidth: this.board.width,
      initialRotation: this.kickTable.spawn_rotation[snapshot.falling.symbol.toLowerCase()] ?? 0,
      symbol: snapshot.falling.symbol,
      from: snapshot.falling
    });
    for (const key of Object.keys(snapshot.falling)) {
      this.falling[key] = deepCopy(snapshot.falling[key]);
    }
    this.frame = snapshot.frame;
    this.subframe = snapshot.subframe;
    this.garbageQueue.fromSnapshot(snapshot.garbage);
    this.held = snapshot.hold;
    this.holdLocked = snapshot.holdLocked;
    this.lastSpin = deepCopy(snapshot.lastSpin);
    this.lastWasClear = snapshot.lastWasClear;
    this.queue = new Queue(this.initializer.queue);
    for (let i = 0; i < snapshot.queue; i++) this.queue.shift();
    this.queue.onRepopulate(this.#onQueueRepopulate.bind(this));
    this.dynamic = {
      gravity: new IncreaseTracker(
        this.initializer.gravity.value,
        this.initializer.gravity.increase,
        this.initializer.gravity.marginTime
      ),
      garbageMultiplier: new IncreaseTracker(
        this.initializer.garbage.multiplier.value,
        this.initializer.garbage.multiplier.increase,
        this.initializer.garbage.multiplier.marginTime
      ),
      garbageCap: new IncreaseTracker(
        this.initializer.garbage.cap.value,
        this.initializer.garbage.cap.increase,
        this.initializer.garbage.cap.marginTime
      )
    };
    for (let i = 0; i < this.frame; i++)
      for (const key of Object.keys(this.dynamic))
        this.dynamic[key].tick();
    this.input = deepCopy(snapshot.input);
    if (this.multiplayer && snapshot.targets)
      this.multiplayer.targets = [...snapshot.targets];
    this.stats = deepCopy(snapshot.stats);
    this.glock = snapshot.glock;
    this.state = snapshot.state;
    this.igeHandler.fromSnapshot(snapshot.ige);
    this.resCache = deepCopy(snapshot.resCache);
  }
  get kickTable() {
    return kicks[this._kickTable];
  }
  get kickTableName() {
    return this._kickTable;
  }
  set kickTable(value) {
    this._kickTable = value;
  }
  get dynamicStats() {
    return {
      apm: this.stats.garbage.attack / (this.frame / 60 / 60) || 0,
      pps: this.stats.pieces / (this.frame / 60) || 0,
      vs: (this.stats.garbage.attack + this.stats.garbage.cleared) / (this.frame / 60) * 100 || 0,
      surgePower: this.b2b.charging ? Math.floor(
        (this.stats.b2b - this.b2b.charging.at + this.b2b.charging.base + 1) * this.dynamic.garbageMultiplier.get()
      ) : 0
    };
  }
  #getEffectiveGravity() {
    return this.glock <= 0 ? this.dynamic.gravity.get() : this.glock <= 180 ? (1 - this.glock / 180) ** 2 * this.dynamic.gravity.get() : 0;
  }
  #hasHitWall() {
    return !!(this.state & constants.flags.STATE_WALL);
  }
  // @ts-expect-error unused
  #hasRotated() {
    return !!(this.state & (constants.flags.ROTATION_LEFT | constants.flags.ROTATION_RIGHT));
  }
  // @ts-expect-error unused
  #hasRotated180() {
    return !!(this.state & constants.flags.ROTATION_180);
  }
  // @ts-expect-error unused
  #isSpin() {
    return !!(this.state & constants.flags.ROTATION_SPIN);
  }
  // @ts-expect-error unused
  #isSpinMini() {
    return !(~this.state & (constants.flags.ROTATION_SPIN | constants.flags.ROTATION_MINI));
  }
  // @ts-expect-error unused
  #isSpinAll() {
    return !!(this.state & constants.flags.ROTATION_SPIN_ALL);
  }
  #isSleep() {
    return !!(this.state & constants.flags.STATE_SLEEP);
  }
  // @ts-expect-error unused
  #isFloored() {
    return !!(this.state & constants.flags.STATE_FLOOR);
  }
  // @ts-expect-error unused
  #isVisible() {
    return !(this.state & constants.flags.STATE_NODRAW);
  }
  // @ts-expect-error unused
  #isSoftDropped() {
    return !!(this.state & constants.flags.ACTION_SOFTDROP);
  }
  #isForcedToLock() {
    return !!(this.state & constants.flags.ACTION_FORCELOCK);
  }
  #is20G() {
    const is20G = this.dynamic.gravity.get() > this.board.height;
    const mode20G = this.misc.movement.may20G;
    if (this.input.keys.softDrop) {
      const preferSoftDrop = this.handling.may20g || is20G && mode20G;
      return (this.handling.sdf === 41 || this.dynamic.gravity.get() * this.handling.sdf > this.board.height) && preferSoftDrop;
    }
    return is20G && mode20G;
  }
  #shouldLock() {
    return !this.misc.movement.infinite && this.falling.lockResets >= this.misc.movement.lockResets;
  }
  #shouldFallFaster() {
    return this.misc.movement.infinite ? false : this.falling.rotResets > this.misc.movement.lockResets + 15;
  }
  #clearFlags(e) {
    this.state &= ~e;
  }
  #__internal_lock(subframe = 1 - this.subframe) {
    this.falling.locking += subframe;
    return this.falling.locking > this.misc.movement.lockTime || !!this.#isForcedToLock() || this.#shouldLock();
  }
  #__internal_fall(value) {
    let y1 = Math.round(1e6 * (this.falling.location[1] - value)) / 1e6, y2 = this.falling.location[1] - 1;
    if (y1 % 1 === 0) y1 -= 1e-6;
    if (y2 % 1 === 0) y2 += 2e-6;
    if (!legal(this.falling.absoluteAt({ y: y1 }), this.board.state) || !legal(this.falling.absoluteAt({ y: y2 }), this.board.state))
      return false;
    const { highestY } = this.falling;
    if (highestY > y1) this.falling.highestY = Math.floor(y1);
    this.falling.location[1] = y1;
    if (this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    this.state &= ~constants.flags.STATE_FLOOR;
    if (y1 < highestY || this.misc.movement.infinite) {
      this.falling.lockResets = 0;
      this.falling.rotResets = 0;
    }
    return true;
  }
  // @ts-expect-error unused
  #__internal_lockout() {
  }
  #__internal_dcd() {
    if (!this.#hasHitWall() || !this.handling.dcd) return;
    this.input.lShift.das = Math.min(
      this.input.lShift.das,
      this.handling.das - this.handling.dcd
    );
    this.input.lShift.arr = this.handling.arr;
    this.input.rShift.das = Math.min(
      this.input.rShift.das,
      this.handling.das - this.handling.dcd
    );
    this.input.rShift.arr = this.handling.arr;
  }
  #fall(subframe = 1 - this.subframe) {
    if (this.falling.safeLock > 0) this.falling.safeLock--;
    if (this.#isSleep()) return;
    let fall = this.#getEffectiveGravity() * subframe;
    if (this.glock > 0) this.glock -= subframe;
    if (this.glock < 0) this.glock = 0;
    if (this.input.keys.softDrop) {
      if (this.handling.sdf === 41) fall = 400 * subframe;
      else {
        fall *= this.handling.sdf;
        fall = Math.max(fall, 0.05 * this.handling.sdf);
      }
    }
    if (this.#shouldLock() && !legal(
      this.falling.absoluteAt({ y: this.falling.location[1] - 1 }),
      this.board.state
    )) {
      fall = 20;
      this.state |= constants.flags.ACTION_FORCELOCK;
    }
    if (this.#shouldFallFaster()) {
      fall += 0.5 * subframe * (this.falling.rotResets - (this.misc.movement.lockResets + 15));
    }
    for (let dropFactor = fall; dropFactor > 0; dropFactor -= Math.min(1, dropFactor)) {
      const y = this.falling.location[1];
      if (!this.#__internal_fall(Math.min(1, dropFactor))) {
        if (this.#__internal_lock(subframe)) {
          if (this.handling.safelock) this.falling.safeLock = 7;
          this.#lock(false);
        }
        return;
      }
      if (Math.floor(y) !== Math.floor(this.falling.location[1])) {
        this.state &= ~constants.flags.ROTATION_ALL;
      }
    }
  }
  #clampRotation(amount) {
    return ((this.falling.rotation + amount) % 4 + 4) % 4;
  }
  #__internal_rotate(newX, newY, newRotation, rotationDirection, kick, _isIRS = false) {
    if (rotationDirection >= 2) {
      rotationDirection = newRotation > this.falling.rotation ? 1 : -1;
      this.state |= constants.flags.ROTATION_180;
    }
    this.falling.x = newX;
    this.falling.y = newY;
    this.falling.rotation = newRotation;
    this.state |= rotationDirection === 1 ? constants.flags.ROTATION_RIGHT : constants.flags.ROTATION_LEFT;
    this.state &= ~(constants.flags.ROTATION_SPIN | constants.flags.ROTATION_MINI | constants.flags.ROTATION_SPIN_ALL);
    if (this.falling.lockResets < 31) this.falling.lockResets++;
    if (this.falling.rotResets < 63) this.falling.rotResets++;
    const spin = this.#detectSpin(this.#isTSpinKick(kick));
    this.lastSpin = {
      piece: this.falling.symbol,
      type: spin
    };
    if (spin) {
      this.state |= constants.flags.ROTATION_SPIN;
      if (spin === "mini") {
        this.state |= constants.flags.ROTATION_MINI;
      }
    }
    this.falling.totalRotations++;
    this.#__internal_dcd();
    if (!this.#shouldLock()) {
      this.falling.locking = 0;
    }
  }
  #kick(to) {
    const kick = performKick(
      this.kickTableName,
      this.falling.symbol,
      this.falling.location,
      [this.falling.aox, this.falling.aoy],
      !this.misc.movement.infinite && this.falling.totalRotations > this.misc.movement.lockResets + 15,
      this.falling.states[to],
      this.falling.rotation,
      to,
      this.board.state
    );
    if (typeof kick === "object") return kick;
    else
      return kick === false ? false : {
        kick: [0, 0],
        newLocation: [this.falling.location[0], this.falling.location[1]],
        id: "00",
        index: 0
      };
  }
  #rotate(amount, isIRS = false) {
    if (this.#isSleep()) {
      if (this.handling.irs === "tap")
        this.falling.irs = ((this.falling.irs + amount) % 4 + 4) % 4;
      return;
    }
    const to = this.#clampRotation(amount);
    this.state |= constants.flags.ACTION_MOVE;
    this.state |= constants.flags.ACTION_ROTATE;
    const kick = this.#kick(to);
    return kick ? this.#__internal_rotate(
      kick.newLocation[0],
      kick.newLocation[1],
      to,
      amount,
      kick,
      isIRS
    ) : void 0;
  }
  nextPiece(ignoreBlockout = false, isHold = false) {
    const newTetromino = this.queue.shift();
    this.initiatePiece(newTetromino, ignoreBlockout, isHold);
  }
  initiatePiece(piece, ignoreBlockout = false, isHold = false) {
    if (this.handling.irs === "hold" && this.falling) {
      let rotationState = 0;
      if (this.input.keys.rotateCCW) rotationState -= 1;
      if (this.input.keys.rotateCW) rotationState += 1;
      if (this.input.keys.rotate180) rotationState += 2;
      this.falling.irs = (rotationState % 4 + 4) % 4;
    }
    if (this.handling.ihs === "hold" && this.input.keys.hold && !isHold) {
      this.state |= constants.flags.ACTION_IHS;
    }
    this.#__internal_dcd();
    this.state &= ~(constants.flags.ROTATION_ALL | constants.flags.STATE_ALL | constants.flags.ACTION_FORCELOCK | constants.flags.ACTION_SOFTDROP | constants.flags.ACTION_MOVE | constants.flags.ACTION_ROTATE);
    this.input.firstInputTime = -1;
    if (!isHold) this.holdLocked = false;
    this.falling = new Tetromino({
      boardHeight: this.board.height,
      boardWidth: this.board.width,
      initialRotation: this.kickTable.spawn_rotation[piece.toLowerCase()] ?? 0,
      symbol: piece,
      from: this.falling
    });
    if (!ignoreBlockout && this.#considerBlockout(isHold)) {
      this.state ^= constants.flags.ACTION_IHS;
      this.falling.irs = 0;
    } else {
      if (this.state & constants.flags.ACTION_IHS) {
        this.state ^= constants.flags.ACTION_IHS;
        this.hold(true, ignoreBlockout);
      } else {
        if (this.falling.irs !== 0) {
          this.#rotate(this.falling.irs, true);
          this.falling.irs = 0;
        }
        if (this.#considerBlockout(!ignoreBlockout || isHold)) {
        } else {
          if (this.#is20G()) {
            this.#slamToFloor();
          }
        }
      }
    }
  }
  #considerBlockout(isSilent = false) {
    if (legal(this.falling.absoluteBlocks, this.board.state)) {
      return false;
    }
    let clutched = false;
    if (this.lastWasClear && this.gameOptions.clutch !== false) {
      const originalY = this.falling.location[1];
      const originalHy = this.falling.highestY;
      while (this.falling.y < this.board.fullHeight) {
        this.falling.location[1]++;
        this.falling.highestY++;
        if (legal(this.falling.absoluteBlocks, this.board.state)) {
          clutched = true;
          break;
        }
      }
      if (!clutched) {
        this.falling.location[1] = originalY;
        this.falling.highestY = originalHy;
      }
    }
    if (!clutched) return true;
    if (!isSilent) {
    }
    return false;
  }
  /** @deprecated */
  hold(_ihs = false, ignoreBlockout = false) {
    if (this.#isSleep()) {
      if (this.handling.ihs === "tap") this.state |= constants.flags.ACTION_IHS;
      return;
    }
    if (this.holdLocked || !this.misc.allowed.hold) return;
    this.holdLocked = !this.misc.infiniteHold;
    if (this.held) {
      const save = this.held;
      this.held = this.falling.symbol;
      this.initiatePiece(save, ignoreBlockout, true);
    } else {
      this.held = this.falling.symbol;
      this.nextPiece(ignoreBlockout, true);
    }
    this.holdLocked = !this.misc.infiniteHold;
  }
  #slamToFloor() {
    while (this.#__internal_fall(1)) {
    }
  }
  get toppedOut() {
    try {
      for (const block of this.falling.blocks) {
        if (this.board.state[-block[1] + this.falling.y][block[0] + this.falling.location[0]] !== null)
          return true;
      }
      return false;
    } catch {
      return true;
    }
  }
  #isTSpinKick(kick) {
    if (typeof kick === "object") {
      return (
        // fin cw and tst ccw
        (kick.id === "23" || kick.id === "03") && kick.kick[0] === 1 && kick.kick[1] === -2 || // fin ccw and tst cw
        (kick.id === "21" || kick.id === "01") && kick.kick[0] === -1 && kick.kick[1] === -2
      );
    }
    return false;
  }
  /** @deprecated */
  rotateCW() {
    return this.#processRotate(1);
  }
  /** @deprecated */
  rotateCCW() {
    return this.#processRotate(-1);
  }
  /** @deprecated */
  rotate180() {
    return this.#processRotate(2);
  }
  /** @deprecated */
  moveRight() {
    const res = this.falling.moveRight(this.board.state);
    if (res && this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    return res;
  }
  /** @deprecated */
  moveLeft() {
    const res = this.falling.moveLeft(this.board.state);
    if (res && this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    return res;
  }
  /** @deprecated */
  dasRight() {
    const res = this.falling.dasRight(this.board.state);
    if (res && this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    return res;
  }
  /** @deprecated */
  dasLeft() {
    const res = this.falling.dasLeft(this.board.state);
    if (res && this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    return res;
  }
  /** @deprecated */
  softDrop() {
    const res = this.falling.softDrop(this.board.state);
    if (res && this.gameOptions.spinBonuses !== "stupid") this.lastSpin = null;
    return res;
  }
  #maxSpin(...spins) {
    const score = (spin) => ["none", "mini", "normal"].indexOf(spin);
    return spins.reduce((a, b) => {
      return score(a) > score(b) ? a : b;
    });
  }
  #detectSpin(finOrTst) {
    if (this.gameOptions.spinBonuses === "none") return "none";
    const tSpin = [
      "all",
      "all-mini",
      "all-mini+",
      "all+",
      "T-spins",
      "T-spins+"
    ].includes(this.gameOptions.spinBonuses) && this.falling.symbol === "t" ? this.#detectTSpin(finOrTst) : false;
    const allSpin = this.falling.isAllSpinPosition(this.board.state);
    switch (this.gameOptions.spinBonuses) {
      case "stupid":
        return this.falling.isStupidSpinPosition(this.board.state) ? "normal" : "none";
      case "T-spins":
        return tSpin || "none";
      case "T-spins+":
        return this.#maxSpin(
          tSpin || "none",
          allSpin ? this.falling.symbol === "t" ? "mini" : "none" : "none"
        );
      case "all":
        return tSpin || (allSpin ? "normal" : "none");
      case "all-mini":
        return tSpin || (allSpin ? "mini" : "none");
      case "all+":
        return this.#maxSpin(
          tSpin || "none",
          allSpin ? this.falling.symbol === "t" ? "mini" : "normal" : "none"
        );
      case "all-mini+":
        return this.#maxSpin(tSpin || "none", allSpin ? "mini" : "none");
      case "mini-only":
        return tSpin === "normal" ? "mini" : this.#maxSpin(tSpin || "none", allSpin ? "mini" : "none");
      case "handheld":
        return "none";
    }
  }
  #detectTSpin(finOrTst) {
    if (this.falling.symbol !== "t") return "none";
    if (finOrTst) return "normal";
    const corners = this.#getTCorners();
    if (corners.filter((item) => item).length < 3) return "none";
    const facingCorners = [
      corners[this.falling.rotation],
      corners[(this.falling.rotation + 1) % 4]
    ];
    if (facingCorners[0] && facingCorners[1]) {
      return "normal";
    }
    return "mini";
  }
  /**
   * Returns array of true/false corners in this form (numbers represent array indices):
   * @example
   *  0    1
   *  🟦🟦🟦
   *  3 🟦 2
   */
  #getTCorners() {
    const [x, y] = [this.falling.location[0] + 1, this.falling.y - 1];
    const getLocation = (x2, y2) => x2 < 0 ? true : x2 >= this.board.width ? true : y2 < 0 ? true : y2 >= this.board.fullHeight ? true : this.board.state[y2][x2] !== null;
    return [
      getLocation(x - 1, y + 1),
      getLocation(x + 1, y + 1),
      getLocation(x + 1, y - 1),
      getLocation(x - 1, y - 1)
    ];
  }
  hardDrop() {
    while (this.#__internal_fall(1)) ;
    return this.#lock(true);
  }
  #lock(hard) {
    this.holdLocked = false;
    const placed = this.falling.blocks.map(
      (block) => [
        this.falling.symbol,
        this.falling.location[0] + block[0],
        this.falling.y - block[1]
      ]
    );
    this.board.add(...placed);
    const { lines, garbageCleared } = this.board.clearBombsAndLines(
      placed.map((b) => [b[1], b[2]])
    );
    const pc = this.board.perfectClear;
    this.stats.garbage.cleared += garbageCleared;
    let brokeB2B = this.stats.b2b;
    if (lines > 0) {
      this.stats.combo++;
      if ((this.lastSpin && this.lastSpin.type !== "none" || lines >= 4) && !(pc && this.pc && this.pc.b2b)) {
        this.stats.b2b++;
        brokeB2B = false;
      }
      if (pc && this.pc && this.pc.b2b) {
        this.stats.b2b += this.pc.b2b;
        brokeB2B = false;
      }
      if (brokeB2B !== false) {
        this.stats.b2b = -1;
      }
    } else {
      this.stats.combo = -1;
      brokeB2B = false;
    }
    const gSpecialBonus = this.initializer.garbage.specialBonus && garbageCleared > 0 && (this.lastSpin && this.lastSpin.type !== "none" || lines >= 4) ? 1 : 0;
    const garbage = garbageCalcV2(
      {
        b2b: Math.max(this.stats.b2b, 0),
        combo: Math.max(this.stats.combo, 0),
        enemies: 0,
        lines,
        piece: this.falling.symbol,
        spin: this.lastSpin ? this.lastSpin.type : "none"
      },
      {
        ...this.gameOptions,
        b2b: { chaining: this.b2b.chaining, charging: !!this.b2b.charging }
      }
    );
    const gEvents = garbage.garbage > 0 || gSpecialBonus > 0 ? [
      this.garbageQueue.round(
        garbage.garbage * this.dynamic.garbageMultiplier.get() + gSpecialBonus
      )
    ] : [];
    if (brokeB2B !== false) {
      let btb = brokeB2B;
      if (this.b2b.charging !== false && btb + 1 > this.b2b.charging.at) {
        const value = Math.floor(
          (btb - this.b2b.charging.at + this.b2b.charging.base + 1) * this.dynamic.garbageMultiplier.get()
        );
        const garbages = [
          Math.round(value / 3),
          Math.round(value / 3),
          value - 2 * Math.round(value / 3)
        ];
        gEvents.splice(0, 0, ...garbages);
        brokeB2B = false;
      }
    }
    if (pc && this.pc) {
      gEvents.push(
        this.garbageQueue.round(
          this.pc.garbage * this.dynamic.garbageMultiplier.get()
        )
      );
    }
    const res = {
      mino: this.falling.symbol,
      garbageCleared,
      lines,
      spin: this.lastSpin ? this.lastSpin.type : "none",
      garbage: gEvents.filter((g) => g > 0),
      stats: this.stats,
      garbageAdded: false,
      topout: false,
      keysPresses: this.resCache.keys.splice(0),
      pieceTime: this.frame - this.resCache.lastLock
    };
    for (const gb of res.garbage) this.stats.garbage.attack += gb;
    if (lines > 0) {
      const cancelEvents = [];
      this.lastWasClear = true;
      while (res.garbage.length > 0) {
        if (res.garbage[0] === 0) {
          res.garbage.shift();
          continue;
        }
        const [r, cancelled] = this.garbageQueue.cancel(
          res.garbage[0],
          this.stats.pieces,
          {
            openerPhase: (this.misc.date ?? /* @__PURE__ */ new Date()) < new Date(2025, 1, 16)
          }
        );
        cancelEvents.push(
          ...cancelled.map((c) => ({
            iid: c.cid,
            amount: c.amount,
            size: c.size
          }))
        );
        if (r === 0) res.garbage.shift();
        else {
          res.garbage[0] = r;
          break;
        }
      }
      cancelEvents.forEach((event) => {
        this.events.emit("garbage.cancel", event);
      });
    } else {
      this.lastWasClear = false;
      const garbages = this.garbageQueue.tank(
        this.frame,
        this.dynamic.garbageCap.get(),
        hard
      );
      res.garbageAdded = garbages;
      if (res.garbageAdded) {
        const tankEvent = [];
        garbages.forEach((garbage2) => {
          this.board.insertGarbage({
            ...garbage2,
            bombs: this.garbageQueue.options.bombs
          });
          if (tankEvent.length === 0 || tankEvent[tankEvent.length - 1].iid !== garbage2.id) {
            tankEvent.push({
              iid: garbage2.id,
              column: garbage2.column,
              amount: garbage2.amount,
              size: garbage2.size
            });
          } else {
            tankEvent[tankEvent.length - 1].amount += garbage2.amount;
          }
        });
        tankEvent.forEach((event) => {
          this.events.emit("garbage.tank", event);
        });
      }
    }
    this.nextPiece();
    this.lastSpin = null;
    try {
      if (!legal(this.falling.absoluteBlocks, this.board.state))
        res.topout = true;
    } catch {
      res.topout = true;
    }
    if (res.garbage.length > 0) {
      if (this.multiplayer)
        this.multiplayer.targets.forEach(
          (target) => res.garbage.forEach(
            (g) => this.igeHandler.send({ amount: g, playerID: target })
          )
        );
    }
    res.garbage.forEach((gb) => this.stats.garbage.sent += gb);
    this.resCache.pieces++;
    this.resCache.garbage.sent.push(...res.garbage);
    this.resCache.garbage.received.push(...res.garbageAdded || []);
    this.resCache.lastLock = this.frame;
    this.stats.pieces++;
    this.stats.lines += lines;
    this.events.emit("falling.lock", deepCopy(res));
    return res;
  }
  press(key) {
    if (key in this) return this[key]();
    else throw new Error("invalid key: " + key);
  }
  #keydown({ data: event }) {
    this.#processSubframe(event.subframe);
    this.resCache.keys.push(event.key);
    switch (event.key) {
      case "moveLeft":
        this.falling.keys++;
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        this.#activateShift("lShift", !!event.hoisted);
        this.#__internal_shift();
        return;
      case "moveRight":
        this.falling.keys++;
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        this.#activateShift("rShift", !!event.hoisted);
        this.#__internal_shift();
        return;
      case "softDrop":
        this.input.keys.softDrop = true;
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        return;
      case "rotateCCW":
        this.input.keys.rotateCCW = true;
        break;
      case "rotateCW":
        this.input.keys.rotateCW = true;
        break;
      case "rotate180":
        this.input.keys.rotate180 = true;
        break;
      case "hold":
        this.input.keys.hold = true;
        break;
    }
    switch (event.key) {
      case "rotateCCW":
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        this.#processRotate(-1);
        break;
      case "rotateCW":
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        this.#processRotate(1);
        break;
      case "rotate180":
        if (!this.misc.allowed.spin180) return;
        if (this.input.firstInputTime == -1)
          this.input.firstInputTime = this.frame + this.subframe;
        this.#processRotate(2);
        break;
      case "hardDrop":
        if (this.misc.allowed.hardDrop === false || this.falling.safeLock !== 0)
          return;
        this.hardDrop();
        return;
      case "hold":
        this.hold();
        return;
    }
  }
  #keyup({ data: event }) {
    this.#processSubframe(event.subframe);
    switch (event.key) {
      case "moveLeft":
        this.input.lShift.held = false;
        this.input.lShift.das = 0;
        this.input.lastShift = this.input.rShift.held ? this.input.rShift.dir : this.input.lastShift;
        if (this.handling.cancel) {
          this.input.rShift.arr = this.handling.arr;
          this.input.rShift.das = 0;
        }
        break;
      case "moveRight":
        this.input.rShift.held = false;
        this.input.rShift.das = 0;
        this.input.lastShift = this.input.lShift.held ? this.input.lShift.dir : this.input.lastShift;
        if (this.handling.cancel) {
          this.input.lShift.arr = this.handling.arr;
          this.input.lShift.das = 0;
        }
        break;
      case "softDrop":
        this.state |= constants.flags.ACTION_SOFTDROP;
        this.input.keys.softDrop = false;
        break;
      case "rotateCCW":
        this.input.keys.rotateCCW = false;
        break;
      case "rotateCW":
        this.input.keys.rotateCW = false;
        break;
      case "rotate180":
        this.input.keys.rotate180 = false;
        break;
      case "hold":
        this.input.keys.hold = false;
        break;
    }
  }
  #activateShift(shift, hoisted) {
    this.input[shift].held = true;
    this.input[shift].das = hoisted ? this.handling.das - this.handling.dcd : 0;
    this.input[shift].arr = this.handling.arr;
    this.input.lastShift = this.input[shift].dir;
  }
  #processRotate(rotation) {
    this.falling.keys += rotation >= 2 ? 2 : 1;
    this.#rotate(rotation);
  }
  #processSubframe(subframe) {
    if (subframe <= this.subframe) return;
    const delta = subframe - this.subframe;
    this.#processAllShift(delta);
    this.#fall(delta);
    this.subframe = subframe;
  }
  #__internal_shift() {
    if (!this.#isSleep()) {
      this.state |= constants.flags.ACTION_MOVE;
      if (legal(
        this.falling.absoluteAt({
          x: this.falling.location[0] + this.input.lastShift
        }),
        this.board.state
      )) {
        this.falling.location[0] += this.input.lastShift;
        if (this.falling.lockResets < 31) this.falling.lockResets++;
        this.#clearFlags(
          constants.flags.ROTATION_ALL | constants.flags.STATE_WALL
        );
        if (this.#is20G()) this.#slamToFloor();
        if (!this.#shouldLock()) this.falling.locking = 0;
        return true;
      } else {
        this.state |= constants.flags.STATE_WALL;
        return false;
      }
    }
  }
  #processShift(shift, delta) {
    if (!this.input[shift].held || this.input.lastShift !== this.input[shift].dir)
      return;
    const arrDelta = Math.max(
      0,
      delta - Math.max(0, this.handling.das - this.input[shift].das)
    );
    this.input[shift].das = Math.min(
      this.input[shift].das + delta,
      this.handling.das
    );
    if (this.input[shift].das < this.handling.das) return;
    if (this.#isSleep()) return;
    this.input[shift].arr += arrDelta;
    if (this.input[shift].arr < this.handling.arr) return;
    const arrMultiplier = this.handling.arr === 0 ? this.board.width : Math.floor(this.input[shift].arr / this.handling.arr);
    this.input[shift].arr -= this.handling.arr * arrMultiplier;
    for (let i = 0; i < arrMultiplier; i++) this.#__internal_shift();
  }
  #processAllShift(subFrameDiff = 1 - this.subframe) {
    for (const shift of ["lShift", "rShift"])
      this.#processShift(shift, subFrameDiff);
  }
  #run(...frames) {
    frames.forEach((frame) => {
      switch (frame.type) {
        case "keydown":
          this.#keydown(frame);
          break;
        case "keyup":
          this.#keyup(frame);
          break;
        case "ige":
          if (frame.data.type === "interaction") {
            if (frame.data.data.type === "garbage") {
              const original = frame.data.data.amt;
              const amount = this.multiplayer?.passthrough?.network ? this.igeHandler.receive({
                playerID: frame.data.data.gameid,
                ackiid: frame.data.data.ackiid,
                amount: frame.data.data.amt,
                iid: frame.data.data.iid
              }) : frame.data.data.amt;
              this.receiveGarbage({
                frame: Number.MAX_SAFE_INTEGER - this.garbageQueue.options.garbage.speed,
                amount,
                size: frame.data.data.size,
                cid: frame.data.data.iid,
                gameid: frame.data.data.gameid,
                confirmed: false
              });
              this.stats.garbage.receive += amount;
              this.events.emit("garbage.receive", {
                iid: frame.data.data.iid,
                amount,
                originalAmount: original
              });
            }
          } else if (frame.data.type === "interaction_confirm") {
            if (frame.data.data.type === "garbage") {
              this.garbageQueue.confirm(
                frame.data.data.iid,
                frame.data.data.gameid,
                frame.frame
              );
              this.events.emit("garbage.confirm", {
                iid: frame.data.data.iid,
                gameid: frame.data.data.gameid,
                frame: frame.frame
              });
            }
          } else if (frame.data.type === "target" && this.multiplayer) {
            this.multiplayer.targets = frame.data.data.targets;
          }
          break;
      }
    });
  }
  tick(frames) {
    this.subframe = 0;
    this.#run(...frames);
    this.frame++;
    this.#processAllShift();
    this.#fall();
    Object.keys(this.dynamic).forEach(
      (key) => this.dynamic[key].tick()
    );
    return { ...this.flushRes() };
  }
  receiveGarbage(...garbage) {
    this.garbageQueue.receive(...garbage);
  }
  getPreview(piece) {
    return tetrominoes[piece.toLowerCase()].preview;
  }
  /** @deprecated */
  onQueuePieces(_listener) {
    console.log(
      `${source_default.redBright("[Triangle.js]")} Engine.onQueuePieces is deprecated and no longer functional. Switch to Engine.events.on("queue.add", (pieces) => {}) instead.`
    );
  }
  static colorMap = {
    i: source_default.bgCyan,
    j: source_default.bgBlue,
    l: source_default.bgYellow,
    o: source_default.bgWhite,
    s: source_default.bgGreenBright,
    t: source_default.bgMagentaBright,
    z: source_default.bgRedBright,
    gb: source_default.bgBlackBright,
    bomb: source_default.bgHex("#FFA500")
  };
  get text() {
    const boardTop = this.board.state.findIndex(
      (row) => row.every((block) => block === null)
    );
    const height = Math.max(this.garbageQueue.size, boardTop, 0);
    const output = [];
    for (let i = 0; i < height; i++) {
      let str = i % 2 === 0 ? "|" : " ";
      if (i < this.garbageQueue.size) str += " " + source_default.bgRed(" ") + " ";
      else str += "   ";
      if (i > boardTop) {
        output.push(
          str + "  ".repeat(this.board.width) + " " + (i % 2 === 0 ? "|" : " ")
        );
        continue;
      }
      for (let j = 0; j < this.board.width; j++) {
        const block = this.board.state[i][j];
        str += block ? _Engine.colorMap[block]("  ") : "  ";
      }
      output.push(str + " " + (i % 2 === 0 ? "|" : " "));
    }
    return output.reverse().join("\n");
  }
  /** Return an engine with the same config. Does not preserve state. */
  clone() {
    return new _Engine(this.initializer);
  }
};
export {
  Board,
  Engine,
  GarbageQueue,
  IGEHandler,
  IncreaseTracker,
  LegacyGarbageQueue,
  Mino,
  Queue,
  RNG,
  Tetromino,
  bag14,
  bag7,
  bag7_1,
  bag7_2,
  bag7_X,
  classic,
  deepCopy,
  garbageCalcV2,
  garbageData,
  kicks as kickData,
  legal,
  pairs,
  performKick,
  polyfills,
  random,
  randomSeed,
  rngMap,
  tetrominoes
};
