// @ts-nocheck
import { Bits as n } from "./utils/bits";
import r from "./utils/msgpackr-943ed70";
import {
  OptionsList,
  spinbonuses_rules,
  kicksets,
  tetrominoes,
  minocolors
} from "./utils/shared";

import { strictShallowEqual } from "fast-equals";

const e = Buffer;

let cached = {};
function itdo(e: any) {
  const t = Object.prototype.toString.call(e);
  if (cached[t]) {
    return cached[t];
  } else {
    return (cached[t] = t.substring(8, t.length - 1).toLowerCase());
  }
}
function initOptions() {
  let OptionsTemplate = {};
  for (const [e, t] of Object.entries(OptionsList)) {
    OptionsTemplate[e] = t.default;
    const n = itdo(t.default);
    switch (n) {
      case "boolean":
      case "number":
      case "array":
      case "object":
        // @ts-ignore
        t.type = n;
        break;
      case "string":
        // @ts-ignore
        t.type = t.allowed || t.possibles ? "table" : "string";
        break;
      default:
        throw new TypeError(
          `Error while templating ${e}: typeof ${n} is not supported as default values`
        );
    }
  }
}
initOptions();
const ve = {
  int64AsType: "number",
  bundleStrings: false,
  sequential: false
};
const ke = new r.Packr(ve);
const we = new r.Unpackr(ve);
const Be = {
  F_ALLOC: 1,
  F_HOOK: 2,
  F_ID: 128
};
const Le = new (class {
  _commands = new Map();
  _codes = new Map();
  _PACK = null;
  _UNPACK = null;
  SymCmd = Symbol("cmd");
  FLAG = Be;
  SetMsgpackr(e, t) {
    this._PACK = e.pack.bind(e);
    this._UNPACK = t.unpack.bind(t);
  }
  GetHandlers() {
    const c = [];
    for (const t of this._commands.values()) {
      if (t.flags & this.FLAG.F_HOOK) {
        c.push(t.name);
      }
    }
    const h = this._commands.get("__pack__")?.table;
    if (h) {
      c.push.apply(c, Object.keys(h));
    }
    return c;
  }
  Add(t, n) {
    this._commands.set(t, n);
    this._codes.set(n.code, n);
    n.name = t;
    if (n.flags & this.FLAG.F_ALLOC) {
      n.buffer = e.from([n.code]);
    }
    if (n.table) {
      n._kv = new Map();
      n._vk = new Map();
      n.getkv = (e) => n._kv.get(e);
      n.getvk = (e) => n._vk.get(e);
      for (const [e, t] of Object.entries(n.table)) {
        n._kv.set(e, t);
        n._vk.set(t, e);
      }
    }
  }
  Encode(t, n, i = {}) {
    const s = this._commands.get(t) ?? this._commands.get("__pack__");
    let o = s.code;
    let r = 1;
    if (s.flags & this.FLAG.F_ALLOC) {
      return s.buffer;
    }
    if (!i.batched && (s.flags & this.FLAG.F_ID || i.id)) {
      r += 3;
      o |= this.FLAG.F_ID;
    }
    const a = s.encode(n, this._PACK, t);
    const l = e.allocUnsafe(r + a.byteLength);
    l.writeUInt8(o, 0);
    l.set(a, r);
    return l;
  }
  Decode(e) {
    const t = new n(e);
    const i = t.peek(6, 2);
    const s = this._codes.get(i);
    const o = {
      command: s?.name
    };
    let r = 1;
    if (!s) {
      throw new ReferenceError(
        `received an unknown code [0x${i.toString(16).padStart(2, "0")}]`
      );
    }
    if (s.flags & this.FLAG.F_ALLOC) {
      return o;
    }
    if (e[0] & this.FLAG.F_ID) {
      o.id = t.peek(24, 8);
      r += 3;
    }
    e = e.subarray(r);
    try {
      o.data = s.decode(e, this._UNPACK);
    } catch (t) {
      console.error(`Failed to decode command ${s.name}: ${e.toString()}`);
      throw t;
    }
    if (this.SymCmd in o.data) {
      o.command = o.data[this.SymCmd];
      o.data = o.data.data;
    }
    return o;
  }
})();
{
  const { F_ALLOC: t, F_HOOK: n, F_ID: i } = Le.FLAG;
  const s = {
    code: 25,
    flags: t
  };
  Le.Add("new", s);
  const o = {
    code: 63,
    flags: t
  };
  Le.Add("die", o);
  const r = {
    code: 19,
    flags: n | t
  };
  Le.Add("rejected", r);
  const a = {
    code: 33,
    flags: n | t
  };
  Le.Add("reload", a);
  Le.Add("ping", {
    code: 9,
    flags: n,
    encode({ recvid: t }) {
      const n = e.allocUnsafe(4);
      n.writeUInt32BE(t, 0);
      return n;
    },
    decode(e) {
      return {
        recvid: e.readUInt32BE(0)
      };
    }
  });
  Le.Add("session", {
    code: 44,
    encode({ ribbonid: t, tokenid: n }) {
      const i = e.allocUnsafe(16);
      i.write(t, 0, 8, "hex");
      i.write(n, 8, 8, "hex");
      return i;
    },
    decode: (e) => ({
      ribbonid: e.toString("hex", 0, 8),
      tokenid: e.toString("hex", 8, 16)
    })
  });
  Le.Add("packets", {
    code: 7,
    encode({ packets: t }) {
      const n = t.reduce((e, t) => e + t.length, 0);
      const i = e.allocUnsafe(n + t.length * 4);
      for (let e = 0, n = 0; e < t.length; e++) {
        const s = t[e];
        i.writeUInt32BE(s.length, n);
        i.set(s, n + 4);
        n += s.length + 4;
      }
      return i;
    },
    decode(e) {
      const t = [];
      for (let n = 0; n < e.length; ) {
        const i = e.readUInt32BE(n);
        n += 4;
        const s = e.subarray(n, n + i);
        t.push(s);
        n += i;
      }
      return {
        packets: t
      };
    }
  });
  Le.Add("kick", {
    table: {
      outdated: 1,
      kick: 2,
      restrict: 3,
      block: 4,
      anticheat: 5,
      manual: 6,
      rename: 7
    },
    flags: n,
    code: 4,
    encode({ reason: t }) {
      let n = e.allocUnsafe(1);
      const i = this.getkv(t);
      n.writeUInt8(i, 0);
      if (!i) {
        n = e.concat([n, e.from(t)]);
      }
      return n;
    },
    decode(e) {
      const t = e.readUInt8(0);
      let n = this.getvk(t);
      n ||= e.toString("utf8", 1);
      return {
        reason: n
      };
    }
  });
  Le.Add("nope", {
    table: {
      "protocol violation": 0,
      "ribbon expired": 1
    },
    code: 42,
    encode({ reason: t }) {
      return e.from([this.getkv(t)]);
    },
    decode(e) {
      const t = e.readUInt8(0);
      return {
        reason: this.getvk(t)
      };
    }
  });
  Le.Add("pni", {
    table: {
      background: 0,
      split: 1,
      load: 2
    },
    code: 51,
    flags: n,
    encode({ type: t, timeout: n }) {
      const i = e.allocUnsafe(3);
      i.writeUInt8(this.getkv(t), 0);
      i.writeUInt16BE(n, 1);
      return i;
    },
    decode(e) {
      return {
        type: this.getvk(e.readUInt8(0)),
        timeout: e.readUInt16BE(1)
      };
    }
  });
  Le.Add("notify", {
    table: {
      deny: 1,
      warm: 2,
      ok: 3,
      error: 4,
      announce: 5
    },
    code: 49,
    flags: n | i,
    encode(t, n) {
      const i = this.getkv(t.type);
      const s = e.from([i]);
      switch (i) {
        case 1: {
          const n = e.allocUnsafe(2 + t.msg.length);
          n.writeUInt16BE(t.timeout);
          n.write(t.msg, 2);
          return e.concat([s, n]);
        }
        case 2:
        case 3:
        case 4:
        case 5:
          return e.concat([s, e.from(t.msg)]);
        default:
          return e.concat([s, n(t)]);
      }
    },
    decode(e, t) {
      const n = e.readUInt8(0);
      const i = this.getvk(n);
      switch (n) {
        case 1:
          return {
            type: i,
            timeout: e.readUInt16BE(1),
            msg: e.toString("utf8", 3)
          };
        case 2:
        case 3:
        case 4:
        case 5:
          return {
            type: i,
            msg: e.toString("utf8", 1)
          };
        default:
          return t(e.subarray(1));
      }
    }
  });
  Le.Add("__pack__", {
    table: {
      "config.handling": 1,
      "channel.subscribe": 2,
      "channel.unsubscribe": 3,
      "social.presence": 16,
      "social.invite": 17,
      "social.link": 18,
      "social.online": 19,
      "social.notification": 20,
      "social.notification.ack": 21,
      "social.dm": 22,
      "social.dm.fail": 23,
      "social.relation.ack": 24,
      "social.relation.add": 25,
      "social.relation.remove": 26,
      "social.relation.update": 27,
      "social.relation.clear": 28,
      "social.party.invite": 29,
      "social.party.invite.accept": 30,
      "game.enter": 48,
      "game.replace": 49,
      "game.forfeit": 50,
      "game.ready": 51,
      "game.start": 52,
      "game.spectate": 53,
      "game.submit": 54,
      "game.advance": 55,
      "game.abort": 56,
      "game.end": 57,
      "game.score": 58,
      "game.waitstate": 59,
      "game.match": 60,
      "game.match.score": 61,
      "game.replay": 62,
      "game.replay.enter": 63,
      "game.replay.ige": 64,
      "game.replay.state": 65,
      "game.replay.board": 66,
      "game.replay.end": 67,
      "game.scope.start": 68,
      "game.scope.end": 69,
      "game.setspec": 70,
      "game.records.revolved": 71,
      "party.ready": 80,
      "party.leave": 81,
      "party.members": 83,
      "party.sync": 82,
      "staff.chat": 96,
      "staff.spam": 97,
      "staff.warn": 98,
      "staff.silence": 99,
      "staff.lift": 100,
      "staff.kickfail": 101,
      "staff.shout": 102,
      "staff.waterfall": 103,
      "staff.game.event": 104,
      "staff.xrc": 105,
      "room.create": 128,
      "room.join": 129,
      "room.leave": 130,
      "room.abort": 131,
      "room.start": 132,
      "room.kick": 133,
      "room.unban": 134,
      "room.banlist": 135,
      "room.setid": 136,
      "room.setconfig": 137,
      "room.update": 138,
      "room.update.bracket": 139,
      "room.update.host": 140,
      "room.update.auto": 141,
      "room.update.supporter": 142,
      "room.player.add": 143,
      "room.player.remove": 144,
      "room.bracket.switch": 145,
      "room.bracket.move": 146,
      "room.owner.transfer": 147,
      "room.owner.revoke": 148,
      "room.chat": 149,
      "room.chat.send": 150,
      "room.chat.clear": 151,
      "room.chat.delete": 152,
      "room.chat.gift": 153,
      "room.chat.game": 154,
      "room.call": 155,
      "league.enter": 177,
      "league.leave": 178,
      "league.match": 179,
      "league.counts": 180,
      "league.ready": 181,
      "server.maintenance": 208,
      "server.announcement": 209,
      "server.authorize": 210,
      "server.migrate": 211,
      "server.migrated": 212,
      "xrc.relog": 255
    },
    flags: i,
    code: 43,
    encode(t, n, i) {
      const s = n(t);
      const o = e.allocUnsafe(1 + s.length);
      const r = this.getkv(i);
      o.writeUInt8(r, 0);
      o.set(s, 1);
      return o;
    },
    decode(e, t) {
      const n = e.readUInt8(0);
      const i = this.getvk(n);
      const s = t(e.subarray(1));
      return {
        [Le.SymCmd]: i,
        data: s
      };
    }
  });
}
const Se = {
  Table: 0,
  Array: 1,
  Struct: 2,
  String: 3,
  Buffer: 4,
  Boolean: 5,
  Int: 6,
  UInt: 7,
  DInt: 8,
  Float: 9,
  UFloat: 10,
  Double: 11,
  Number: 12,
  Any: 13
};
const Te = {
  NaN: 0,
  Infinity: 1,
  UInt: 2,
  Int: 3,
  Double: 4
};
const Me = {
  BUFFER: 1,
  DOUBLE: 2,
  QWORD: 3,
  HEX: 4
};
class Ee {
  static TYPES = Se;
  static TYPES_INDEX = Array.from(Object.keys(this.TYPES));
  static SUPPORTED_TYPES = new Set([
    "undefined",
    "null",
    "boolean",
    "number",
    "string",
    "array"
  ]);
  static cla32(e) {
    if (e >>> 0 === e) {
      return Math.max(32 - Math.clz32(e), 1);
    } else {
      return Math.max(32 - Math.clz32(~e) + 1, 2);
    }
  }
  static GetIntSize(e) {
    return Math.ceil(this.cla32(e) / 4);
  }
  static DInt = class {
    constructor({ min: e, max: t }) {
      this._minBits = e;
      this._maxBits = t;
      this._minSize = Math.pow(2, e);
      this._maxSize = Math.pow(2, t);
    }
    get minSize() {
      return this._minSize;
    }
    get maxSize() {
      return this._maxSize;
    }
    readSize(e) {
      if (e) {
        return this._maxBits;
      } else {
        return this._minBits;
      }
    }
    writeSize(e) {
      let t;
      switch (e) {
        case e >>> 0:
          t = this._minSize <= e;
          break;
        case e | 0:
          t = -this._minSize / 2 > e;
          break;
        default:
          throw new RangeError(
            `Float/Double is not supported for DInt: got ${e}`
          );
      }
      return {
        bit: t,
        size: t ? this._maxBits : this._minBits
      };
    }
  };
  static Number = new (class {
    TYPES = Te;
    encode(e, t) {
      const { TYPES: n } = this;
      if (typeof t != "number") {
        throw new TypeError(`Attempted to encode ${typeof t} as a number`);
      }
      if (Number.isNaN(t)) {
        return e.writeUInt(n.NaN, 3);
      }
      if (!Number.isFinite(t)) {
        e.writeUInt(n.Infinity, 3);
        return e.writeBoolean(t === Number.POSITIVE_INFINITY);
      }
      switch (t) {
        case t >>> 0: {
          const i = Ee.GetIntSize(t);
          e.writeUInt(n.UInt, 3);
          e.writeUInt(i - 1, 3);
          e.writeUInt(t, i * 4);
          break;
        }
        case t | 0: {
          const i = Ee.GetIntSize(t);
          e.writeUInt(n.Int, 3);
          e.writeUInt(i - 1, 3);
          e.writeInt(t, i * 4);
          break;
        }
        default:
          e.writeUInt(n.Double, 3);
          e.writeDouble(t);
      }
    }
    decode(e) {
      switch (e.readUInt(3)) {
        case 0:
          return NaN;
        case 1:
          if (e.readBoolean()) {
            return Number.POSITIVE_INFINITY;
          } else {
            return Number.NEGATIVE_INFINITY;
          }
        case 2: {
          const t = e.readUInt(3) + 1;
          return e.readUInt(t * 4);
        }
        case 3: {
          const t = e.readUInt(3) + 1;
          return e.readInt(t * 4);
        }
        case 4:
          return e.readDouble();
      }
    }
  })();
  static Table = class {
    constructor(e, t = "strict") {
      this._kv = new Map();
      this._vk = new Map();
      for (const [t, a] of e.entries()) {
        this._kv.set(a, t + 1);
        this._vk.set(t + 1, a);
      }
      this._mode = t;
      this._size = Math.floor(Math.log2(this._kv.size)) + 1;
      this.has = this._kv.has.bind(this._kv);
    }
    get mode() {
      return this._mode;
    }
    get size() {
      return this._size;
    }
    get struct() {
      const a = {};
      for (const [t, l] of this._kv.entries()) {
        a[t] = "0x" + l.toString(16).padStart(2, "0");
      }
      return a;
    }
    getkv(e) {
      return this._kv.get(e);
    }
    getvk(e) {
      return this._vk.get(e);
    }
  };
  static Array = class {
    constructor(e = "default", { list: t, min: n, max: i } = {}) {
      this._mode = e;
      switch (e) {
        case "strict":
          this._table = new Ee.Table(t);
          break;
        case "flexible":
          throw new Error("Flexible mode is not implemented yet");
        case "default":
      }
      n = n ?? 7;
      i = i ?? 15;
      const h = {
        min: n,
        max: i
      };
      this._prop = new Ee.DInt(h);
    }
    get mode() {
      return this._mode;
    }
    encode(e, t) {
      e.writeDInt(t.length, this._prop);
      switch (this._mode) {
        case "strict":
          for (const n of t) {
            e.writeTable(n, this._table);
          }
          break;
        case "flexible":
          throw new Error("Flexible mode is not implemented yet");
        default:
          for (const n of t) {
            e.writeAny(n, this);
          }
      }
    }
    decode(e) {
      const t = e.readDInt(this._prop);
      const n = [];
      if (this._mode === "strict") {
        for (let i = 0; i < t; i++) {
          n.push(e.readTable(this._table));
        }
      } else {
        for (let i = 0; i < t; i++) {
          n.push(e.readAny(this));
        }
      }
      return n;
    }
  };
  static init() {
    this.SUPPORTED_TYPES_TABLE = new this.Table(
      Array.from(this.SUPPORTED_TYPES.keys())
    );
    this.DEFAULT_ARRAY = new this.Array();
    this.DEFAULT_PROP = new this.DInt({
      min: 8,
      max: 32
    });
  }
  constructor() {
    this.ref = new Map();
    this.refid = 0;
  }
  static Encoder = class t extends this {
    static TYPES = Me;
    constructor(e = null, t = null) {
      super();
      this._buffer = [];
      this._size = 0;
      this._packr = e;
      this._packBuffer = t;
    }
    get buffer() {
      return this._buffer;
    }
    get size() {
      return this._size;
    }
    get byteLength() {
      return Math.ceil(this._size / 8);
    }
    realign() {
      return (this._size += (8 - (this._size % 8)) % 8);
    }
    _insert(e, t, n = null) {
      if (n) {
        this.realign();
      }
      this._size += t;
      return this._buffer.push({
        val: e,
        size: t,
        type: n
      });
    }
    writeTable(e, t) {
      if (t.mode === "strict") {
        return this._insert(t.getkv(e), t.size);
      }
      const n = t.getkv(e);
      if (n === undefined) {
        this._insert(null, t.size);
        return this.writeAny(e);
      } else {
        return this._insert(n, t.size);
      }
    }
    writeArray(e, t = Ee.DEFAULT_ARRAY) {
      if (t.mode === "strict") {
        return t.encode(this, e);
      } else if (this.ref.has(e)) {
        this._insert(true, 1);
        return this.writeDInt(this.ref.get(e), Ee.DEFAULT_PROP);
      } else {
        this._insert(false, 1);
        this.ref.set(e, this.refid++);
        return t.encode(this, e);
      }
    }
    writeStruct(e, t) {
      return t.encode(this, e);
    }
    writeString(n, i = true) {
      n = e.from(i ? `${n}\0` : n);
      return this._insert(n, n.byteLength * 8, t.TYPES.BUFFER);
    }
    writeBuffer(e) {
      return this._insert(e, e.byteLength * 8, t.TYPES.BUFFER);
    }
    writeBoolean(e) {
      return this._insert(!!e, 1);
    }
    writeInt(e, t) {
      return this._insert(e, t);
    }
    writeUInt(e, t) {
      return this._insert(e, t);
    }
    writeUInt64(e) {
      return this._insert(e, 64, t.TYPES.QWORD);
    }
    writeDInt(e, t) {
      const n = t.writeSize(e);
      this._insert(n.bit, 1);
      return this._insert(e, n.size);
    }
    writeFloat(e, t, n) {
      this._insert(e < 0, 1);
      return this._insert(Math.round(e * n), t);
    }
    writeUFloat(e, t, n) {
      return this._insert(Math.round(e * n), t);
    }
    writeDouble(e) {
      return this._insert(e, 64, t.TYPES.DOUBLE);
    }
    writeNumber(e) {
      return Ee.Number.encode(this, e);
    }
    writeHex(e, n) {
      return this._insert(e, n * 8, t.TYPES.HEX);
    }
    writeAny(e, t) {
      const n = b(e);
      if (!Ee.SUPPORTED_TYPES.has(n)) {
        throw new TypeError(
          `Type ${n} is not implemented for NetCodec.TYPES.Any`
        );
      }
      this.writeTable(n, Ee.SUPPORTED_TYPES_TABLE);
      switch (n) {
        case "boolean":
          this.writeBoolean(e);
          break;
        case "null":
        case "undefined":
          break;
        case "number":
          Ee.Number.encode(this, e);
          break;
        case "string":
          this.writeString(e);
          break;
        case "array":
          this.writeArray(e, t);
      }
    }
    writeByType(e, t, ...n) {
      return this[`write${Ee.TYPES_INDEX[e]}`](t, ...n);
    }
    pack(e) {
      this._packr.useBuffer(this._packBuffer);
      const n = this._packr.pack(e);
      return this._insert(n, n.byteLength * 8, t.TYPES.BUFFER);
    }
    finalize(i = null) {
      const s = i ?? e.allocUnsafe(this.byteLength);
      const o = new n(s);
      for (const { val: e, size: n, type: i } of this._buffer) {
        switch (i) {
          case t.TYPES.BUFFER:
            o.offset += (8 - (o.offset % 8)) % 8;
            s.set(e, o.offset / 8);
            o.seek(e.byteLength * 8, 2);
            break;
          case t.TYPES.DOUBLE:
            o.offset += (8 - (o.offset % 8)) % 8;
            s.writeDoubleBE(e, o.offset / 8);
            o.seek(64, 2);
            break;
          case t.TYPES.QWORD:
            o.offset += (8 - (o.offset % 8)) % 8;
            s.writeBigUInt64BE(e, o.offset / 8);
            o.seek(64, 2);
            break;
          case t.TYPES.HEX:
            o.offset += (8 - (o.offset % 8)) % 8;
            s.write(e, o.offset / 8, "hex");
            o.seek(n, 2);
            break;
          default:
            o.write(e, n);
        }
      }
      return s;
    }
  };
  static Decoder = class e extends this {
    static _MAX_BITS = Math.log2(Number.MAX_SAFE_INTEGER);
    static _MAX_BITS_SIGNED = 32;
    constructor(e, t = null) {
      super();
      this._bits = new n(e);
      this._unpack = t;
    }
    get length() {
      return this._bits.length;
    }
    get offset() {
      return this._bits.offset;
    }
    set offset(e) {
      this._bits.offset = e;
    }
    get buffer() {
      return this._bits.buffer;
    }
    get byteOffset() {
      return Math.ceil(this.offset / 8);
    }
    realign() {
      this.offset = this.byteOffset * 8;
    }
    _read_signed(t) {
      const n = e._MAX_BITS_SIGNED - t;
      return (this._read(t) << n) >> n;
    }
    _read(e) {
      return this._bits.read(e);
    }
    readTable(e) {
      const t = e.size;
      if (this.peek(t) !== 0) {
        return e.getvk(this._read(t));
      } else {
        this.seek(t, 2);
        return this.readAny();
      }
    }
    readArray(e = Ee.DEFAULT_ARRAY) {
      if (e.mode === "strict") {
        return e.decode(this);
      }
      if (this._read(1)) {
        return this.ref.get(this.readDInt(Ee.DEFAULT_PROP));
      }
      const t = [];
      this.ref.set(this.refid++, t);
      t.push.apply(t, e.decode(this));
      return t;
    }
    readStruct(e) {
      return e.decode(this);
    }
    readString(e) {
      const t = this.byteOffset;
      let n;
      if (typeof e == "number") {
        n = t + e;
        this.seek(n * 8);
      } else {
        n = this.buffer.indexOf(0, t);
        this.seek((n + 1) * 8);
      }
      return this.buffer.toString("utf8", t, n);
    }
    readBuffer(e) {
      const t = this.byteOffset;
      const n = t + e;
      this.seek(n * 8);
      return this.buffer.subarray(t, n);
    }
    readBoolean() {
      return !!this._read(1);
    }
    readInt(t) {
      if (t > e._MAX_BITS_SIGNED) {
        throw new RangeError(
          `${t} of bits is not supported for signed values, max is ${e._MAX_BITS_SIGNED}`
        );
      }
      return this._read_signed(t);
    }
    readUInt(t) {
      if (t > e._MAX_BITS) {
        throw new RangeError(
          `${t} of bits is not supported, max is ${e._MAX_BITS}`
        );
      }
      return this._read(t);
    }
    readUInt64() {
      const e = this.byteOffset;
      this.seek(e * 8 + 64);
      return this.buffer.readBigUInt64BE(e);
    }
    readDInt(e, t = false) {
      const n = e.readSize(this._read(1));
      if (t) {
        return this._read_signed(n);
      } else {
        return this._read(n);
      }
    }
    readFloat(e, t) {
      if (this.peek(1)) {
        return this._read_signed(e + 1) / t;
      } else {
        this.seek(1, 2);
        return this._read(e) / t;
      }
    }
    readUFloat(e, t) {
      return this._read(e) / t;
    }
    readDouble() {
      const e = this.byteOffset;
      this.seek(e * 8 + 64);
      return this.buffer.readDoubleBE(e);
    }
    readNumber() {
      return Ee.Number.decode(this);
    }
    readHex(e) {
      const t = this.byteOffset;
      const n = t + e;
      this.seek(n * 8);
      return this.buffer.toString("hex", t, n);
    }
    readAny(e) {
      switch (this.readTable(Ee.SUPPORTED_TYPES_TABLE)) {
        case "boolean":
          return this.readBoolean();
        case "null":
          return null;
        case "undefined":
          return;
        case "number":
          return Ee.Number.decode(this);
        case "string":
          return this.readString();
        case "array":
          return this.readArray(e);
      }
    }
    readByType(e, ...t) {
      return this[`read${Ee.TYPES_INDEX[e]}`](...t);
    }
    peek(e, t) {
      return this._bits.peek(e, t);
    }
    peekTable(e, t = this.offset) {
      return e.getvk(this.peek(e.size, t));
    }
    peekDInt(e, t = this.offset) {
      return this.peek(e.readSize(this.peek(1, t)), t + 1);
    }
    seek(e, t) {
      this._bits.seek(e, t);
    }
    unpack() {
      this.realign();
      return this._unpack(this.byteOffset);
    }
  };
}
class De {
  static _MAX_BUFFER = 65536;
  static BUFFER = e.alloc(this._MAX_BUFFER);
  static _LIST = {};
  static get LIST() {
    return this._LIST;
  }
  static AddExtension(t, n = {}) {
    this._LIST[t.name] = t;
    if ("ownBuffer" in n) {
      t.BUFFER = e.alloc(this._MAX_BUFFER);
    }
  }
  static AddTable(e, t, n) {
    this["$$" + e] = new Ee.Table(t, n);
  }
  static AddProperty(e, t) {
    this["$" + e] = new Ee.DInt(t);
  }
  static LoadExtensions(e) {
    let a = 10;
    function l(e) {
      return e.encode.call(e, new Ee.Encoder(this, e.constructor.BUFFER));
    }
    function h(e, t, n, i) {
      return e.decode(new Ee.Decoder(t, (e) => n(i + e)));
    }
    for (const n of Object.values(this._LIST)) {
      n.ext_code = a++;
      e.addExtension({
        Class: n,
        type: n.ext_code,
        pack: l,
        unpack: h.bind(null, n)
      });
    }
  }
}
class Oe extends De {
  static AddStructure(e) {
    this._cstFields = new Map();
    this._fixFields = new Map();
    this._optFields = new Map();
    for (const [t, { mode: n, type: c, size: h, value: u }] of Object.entries(
      e
    )) {
      switch (n) {
        case "static":
          this._cstFields.set(t, u);
          break;
        case "fixed":
          const e = {
            type: c,
            size: h
          };
          this._fixFields.set(t, e);
          break;
        case "optional":
          const n = {
            type: c,
            size: h
          };
          this._optFields.set(t, n);
      }
    }
    super.AddTable("prop", Array.from(this._optFields.keys()));
  }
  static encode(e, t) {
    for (const [n, { type: i, size: s }] of this._fixFields.entries()) {
      e.writeByType(i, t[n], s);
    }
    for (const [n, { type: i, size: s }] of this._optFields.entries()) {
      if (t[n] !== undefined) {
        if (i !== Ee.TYPES.DInt || t[n] !== null) {
          e.writeTable(n, this.$$prop);
          e.writeByType(i, t[n], s);
        }
      }
    }
    e.writeUInt(null, this.$$prop.size);
  }
  static decode(e) {
    const t = {};
    const n = this.$$prop.size;
    for (const [n, { type: i, size: s }] of this._fixFields.entries()) {
      t[n] = e.readByType(i, s);
    }
    for (let i = e.peek(n); i !== 0; i = e.peek(n)) {
      const n = e.readTable(this.$$prop);
      const { type: i, size: s } = this._optFields.get(n);
      const o = e.readByType(i, s);
      t[n] = o;
    }
    for (const [e, n] of this._cstFields.entries()) {
      t[e] = n;
    }
    return t;
  }
}
class Pe extends De {
  static init() {
    super.AddExtension(this);
    super.AddProperty("prov", {
      min: 18,
      max: 26
    });
  }
  static decode(e) {
    return new this(e.readUInt(13), e.readDInt(this.$prov), e.unpack());
  }
  constructor(e, t, n) {
    super();
    this.gameid = e;
    this.provisioned = t;
    this.frames = n.map((e) => new Re(e));
  }
  encode(e) {
    const t = this.constructor;
    const n = this.provisioned;
    e.writeUInt(this.gameid, 13);
    e.writeDInt(n, t.$prov);
    e.pack(this.frames);
    return e.finalize();
  }
}
class We extends De {
  static init() {
    super.AddExtension(this);
    super.AddProperty("long", {
      min: 16,
      max: 32
    });
  }
  static decode(e) {
    const t = [];
    const n = e.readUInt(13);
    for (let i = 0; i < n; i++) {
      const n = {
        board: {}
      };
      n.gameid = e.readUInt(13);
      n.board.f = e.readUInt(10);
      n.board.g = e.readDInt(this.$long);
      n.board.w = e.readUInt(Ue.MAX_WIDTH);
      n.board.h = e.readUInt(Ue.MAX_HEIGHT);
      n.board.b = e.readStruct(Ue);
      t[i] = n;
    }
    return new this(t);
  }
  constructor(e) {
    super();
    this.boards = e;
  }
  encode(e) {
    const t = this.constructor;
    e.writeUInt(this.boards.length, 13);
    for (const {
      gameid: n,
      board: { b: i, f: s, g: o, w: r, h: a }
    } of this.boards) {
      e.writeUInt(n, 13);
      e.writeUInt(s, 10);
      e.writeDInt(o, t.$long);
      e.writeUInt(r, Ue.MAX_WIDTH);
      e.writeUInt(a, Ue.MAX_HEIGHT);
      e.writeStruct(i, Ue);
    }
    return e.finalize();
  }
}
class He extends De {
  static init() {
    super.AddExtension(this);
    super.AddTable("extraStat", [
      "none",
      "revives",
      "escapeartist",
      "blockrationing_app",
      "blockrationing_final",
      "talentless"
    ]);
  }
  static decode(e) {
    const t = [];
    const n = e.readUInt(13);
    for (let i = 0; i < n; i++) {
      const n = {
        stats: {},
        allies: []
      };
      t[i] = n;
      n.gameid = e.readUInt(13);
      n.stats.rank = e.readUInt(6);
      n.stats.altitude = e.readFloat(18, 10);
      n.stats.btb = e.readUInt(13);
      n.specCount = e.readUInt(10);
      n.speedrun = e.readBoolean();
      n.nearWR = e.readBoolean();
      const s = e.readUInt(3);
      for (let t = 0; t < s; t++) {
        n.allies.push(e.readUInt(13));
      }
      n.stats.revives = 0;
      n.stats.escapeartist = 0;
      n.stats.blockrationing_app = 0;
      n.stats.blockrationing_final = 0;
      switch (e.readTable(this.$$extraStat)) {
        case "none":
          break;
        case "revives":
          n.stats.revives = e.readUInt(8);
          break;
        case "escapeartist":
          n.stats.escapeartist = e.readUInt(9);
          break;
        case "blockrationing_app":
          n.stats.blockrationing_app = e.readFloat(10, 100);
          break;
        case "blockrationing_final":
          n.stats.blockrationing_final = e.readUInt(11);
          break;
        case "talentless":
          n.talentless = true;
      }
    }
    return new this(t);
  }
  constructor(e) {
    super();
    this.sb = e;
  }
  encode(e) {
    const t = this.constructor;
    e.writeUInt(this.sb.length, 13);
    for (const {
      gameid: n,
      stats: i,
      allies: s,
      specCount: o,
      speedrun: r,
      nearWR: a,
      talentless: l
    } of this.sb) {
      e.writeUInt(n, 13);
      e.writeUInt(Math.floor(i.rank), 6);
      e.writeFloat(i.altitude.toFixed(2), 18, 10);
      e.writeUInt(i.btb, 13);
      e.writeUInt(o, 10);
      e.writeBoolean(r);
      e.writeBoolean(a);
      if (s) {
        e.writeUInt(s.length, 3);
        for (const t of s) {
          e.writeUInt(t, 13);
        }
      } else {
        e.writeUInt(0, 3);
      }
      let c = "none";
      if (i.revives) {
        c = "revives";
      }
      if (i.escapeartist) {
        c = "escapeartist";
      }
      if (i.blockrationing_app) {
        c = "blockrationing_app";
      }
      if (i.blockrationing_final) {
        c = "blockrationing_final";
      }
      if (l) {
        c = "talentless";
      }
      e.writeTable(c, t.$$extraStat);
      switch (c) {
        case "none":
        case "talentless":
          break;
        case "revives":
          e.writeUInt(i.revives, 8);
          break;
        case "escapeartist":
          e.writeUInt(i.escapeartist, 9);
          break;
        case "blockrationing_app":
          e.writeFloat(i.blockrationing_app.toFixed(3), 10, 100);
          break;
        case "blockrationing_final":
          e.writeUInt(i.blockrationing_final, 11);
      }
    }
    return e.finalize();
  }
}
class Re extends De {
  static init() {
    super.AddExtension(this, {
      ownBuffer: true
    });
    super.AddProperty("frame", {
      min: 18,
      max: 26
    });
    super.AddTable("type", [
      "keydown",
      "keyup",
      "start",
      "full",
      "end",
      "ige",
      "strategy",
      "manual_target"
    ]);
    super.AddTable("key", [
      "moveLeft",
      "moveRight",
      "rotate180",
      "rotateCCW",
      "rotateCW",
      "softDrop",
      "hardDrop",
      "undo",
      "redo",
      "hold",
      "retry",
      "exit"
    ]);
  }
  static decode(e) {
    const t = {};
    t.type = e.readTable(this.$$type);
    t.frame = e.readDInt(this.$frame);
    switch (t.type) {
      case "keydown":
      case "keyup": {
        const n = e.readTable(this.$$key);
        const i = e.readBoolean();
        const s = {
          key: n,
          subframe: e.readFloat(4, 10)
        };
        if (i) {
          s.hoisted = true;
        }
        t.data = s;
        break;
      }
      case "start":
        t.data = {};
        break;
      case "full":
        t.data = e.readStruct($e);
        break;
      case "end":
        t.data = e.readStruct(nt);
        break;
      case "ige":
        t.data = e.readStruct(je);
        break;
      case "strategy":
        t.data = e.readUInt(3);
        break;
      case "manual_target":
        t.data = e.readUInt(13);
        break;
      default:
        t.data = e.unpack();
    }
    return new this(t);
  }
  constructor(e) {
    super();
    this.type = e.type;
    this.frame = e.frame;
    this.data = e.data;
  }
  encode(e) {
    const t = this.constructor;
    e.writeTable(this.type, t.$$type);
    e.writeDInt(this.frame, t.$frame);
    switch (this.type) {
      case "keydown":
      case "keyup": {
        const n = this.data.hoisted;
        const i = this.data.subframe;
        e.writeTable(this.data.key, t.$$key);
        e.writeBoolean(n);
        e.writeFloat(i, 4, 10);
        return e.finalize();
      }
      case "start":
        return e.finalize();
      case "full":
        e.writeStruct(this.data, $e);
        return e.finalize();
      case "end":
        e.writeStruct(this.data, nt);
        return e.finalize();
      case "ige":
        e.writeStruct(this.data, je);
        return e.finalize();
      case "strategy":
        e.writeUInt(this.data, 3);
        return e.finalize();
      case "manual_target":
        e.writeUInt(this.data, 13);
        return e.finalize();
      default:
        console.warn(
          `Fallback to packer ${this.type} -> ${JSON.stringify(this.data)}`
        );
        e.pack(this.data);
        return e.finalize();
    }
  }
}
class Ne extends De {
  static init() {
    super.AddExtension(this);
  }
  static decode(e) {
    const t = [];
    const n = e.readUInt(13);
    for (let i = 0; i < n; i++) {
      const n = {};
      n.userid = e.readHex(12);
      n.gameid = e.readUInt(13);
      n.alive = e.readBoolean();
      n.naturalorder = e.readUInt(13);
      n.options = e.readStruct(et);
      t.push(n);
    }
    return t;
  }
  constructor(e) {
    super();
    this.players = e;
  }
  encode(e) {
    e.writeUInt(this.players.length, 13);
    for (const {
      gameid: t,
      userid: n,
      alive: i,
      naturalorder: s,
      options: o
    } of this.players) {
      e.writeHex(n, 12);
      e.writeUInt(t, 13);
      e.writeBoolean(i);
      e.writeUInt(s, 13);
      e.writeStruct(o, et);
    }
    return e.finalize();
  }
}
class $e extends De {
  static init() {
    super.AddTable("piece", [null, ...Object.keys(tetrominoes)], "flexible");
    super.AddTable("ixs", ["off", "hold", "tap"]);
  }
  static encode(e, t) {
    const n = t.game.board;
    const i = t.game.bag;
    const s = t.game.hold;
    const o = t.game.g;
    const r = t.game.controlling;
    const a = t.game.falling;
    const l = t.game.handling;
    e.writeUInt(i.length, 12);
    for (const t of i) {
      e.writeTable(t, this.$$piece);
    }
    e.writeStruct(n, Ue);
    e.writeBoolean(s.locked);
    e.writeTable(s.piece, this.$$piece);
    e.writeDouble(o);
    e.writeBoolean(r.inputSoftdrop);
    e.writeBoolean(r.lastshift === -1);
    e.writeBoolean(r.lShift.held);
    e.writeBoolean(r.rShift.held);
    e.writeUInt(t.diyusi, 4);
    e.writeDouble(r.lShift.arr);
    e.writeDouble(r.rShift.arr);
    e.writeDouble(r.lShift.das);
    e.writeDouble(r.rShift.das);
    e.writeStruct(a, Xe);
    e.writeFloat(l.arr, 6, 10);
    e.writeUInt(l.sdf, 6);
    e.writeBoolean(l.safelock);
    e.writeBoolean(l.cancel);
    e.writeBoolean(l.may20g);
    e.writeBoolean(t.game.playing);
    e.writeFloat(l.das, 8, 10);
    e.writeFloat(l.dcd, 8, 10);
    e.writeTable(l.irs, this.$$ixs);
    e.writeTable(l.ihs, this.$$ixs);
    e.writeStruct(t.stats, qe);
  }
  static decode(e) {
    const t = {};
    const n = {
      bag: [],
      controlling: {
        lShift: {
          dir: -1
        },
        rShift: {
          dir: 1
        }
      },
      handling: {}
    };
    const i = n.controlling;
    const s = n.handling;
    const o = e.readUInt(12);
    for (let t = 0; t < o; t++) {
      n.bag.push(e.readTable(this.$$piece));
    }
    n.board = e.readStruct(Ue);
    n.hold = {
      locked: e.readBoolean(),
      piece: e.readTable(this.$$piece)
    };
    n.g = e.readDouble();
    i.inputSoftdrop = e.readBoolean();
    i.lastshift = e.readBoolean() ? -1 : 1;
    i.lShift.held = e.readBoolean();
    i.rShift.held = e.readBoolean();
    t.diyusi = e.readUInt(4);
    i.lShift.arr = e.readDouble();
    i.rShift.arr = e.readDouble();
    i.lShift.das = e.readDouble();
    i.rShift.das = e.readDouble();
    n.falling = e.readStruct(Xe);
    s.arr = e.readFloat(6, 10);
    s.sdf = e.readUInt(6);
    s.safelock = e.readBoolean();
    s.cancel = e.readBoolean();
    s.may20g = e.readBoolean();
    n.playing = e.readBoolean();
    s.das = e.readFloat(8, 10);
    s.dcd = e.readFloat(8, 10);
    s.irs = e.readTable(this.$$ixs);
    s.ihs = e.readTable(this.$$ixs);
    t.stats = e.readStruct(qe);
    t.game = n;
    return t;
  }
}
class Ue extends De {
  static MAX_WIDTH = Math.log2(512);
  static MAX_HEIGHT = Math.log2(512);
  static init() {
    super.AddTable("blk", [false, null, ...minocolors]);
  }
  static encode(e, t) {
    const n = t[0]?.length ?? 0;
    const i = t.length;
    if (!n) {
      return e.writeUInt(0, this.MAX_WIDTH);
    }
    e.writeUInt(n, this.MAX_WIDTH);
    e.writeUInt(i, this.MAX_HEIGHT);
    for (const n of t) {
      if (n.some((e) => e !== null)) {
        for (const t of n) {
          e.writeTable(t, this.$$blk);
        }
      } else {
        e.writeTable(false, this.$$blk);
      }
    }
  }
  static decode(e) {
    const t = [];
    const n = e.readUInt(this.MAX_WIDTH);
    if (!n) {
      return t;
    }
    const i = e.readUInt(this.MAX_HEIGHT);
    for (let s = 0; s < i; s++) {
      if (e.peekTable(this.$$blk) !== false) {
        t[s] = [];
        for (let i = 0; i < n; i++) {
          t[s][i] = e.readTable(this.$$blk);
        }
      } else {
        e.seek(4, 2);
        t[s] = new Array(n).fill(null);
      }
    }
    return t;
  }
}
class Xe extends De {
  static init() {
    super.AddTable("piece", [null, ...Object.keys(tetrominoes)], "flexible");
  }
  static encode(e, t) {
    e.writeTable(t.type, this.$$piece);
    e.writeInt(t.x, Ue.MAX_WIDTH);
    e.writeUInt(t.r, 2);
    e.writeUInt(t.hy, Ue.MAX_HEIGHT);
    e.writeUInt(t.irs, 2);
    e.writeUInt(t.kick, 5);
    e.writeUInt(t.keys, 16);
    e.writeUInt(t.flags, 15);
    e.writeUInt(t.safelock, 3);
    e.writeUInt(t.lockresets, 5);
    e.writeUInt(t.rotresets, 6);
    e.writeBoolean(t.skip.length);
    if (t.skip.length) {
      for (const n of t.skip) {
        e.writeUInt(n + 1, 7);
      }
      e.writeUInt(0, 7);
    }
    e.writeDouble(t.y);
    e.writeDouble(t.locking);
  }
  static decode(e) {
    const t = {};
    t.type = e.readTable(this.$$piece);
    t.x = e.readInt(Ue.MAX_WIDTH);
    t.r = e.readUInt(2);
    t.hy = e.readUInt(Ue.MAX_HEIGHT);
    t.irs = e.readUInt(2);
    t.kick = e.readUInt(5);
    t.keys = e.readUInt(16);
    t.flags = e.readUInt(15);
    t.safelock = e.readUInt(3);
    t.lockresets = e.readUInt(5);
    t.rotresets = e.readUInt(6);
    t.skip = [];
    if (e.readBoolean()) {
      const n = 7;
      for (let i = e.peek(n); i !== 0; i = e.peek(n)) {
        t.skip.push(e.readUInt(n) - 1);
      }
      e.seek(n, 2);
    }
    t.y = e.readDouble();
    t.locking = e.readDouble();
    return t;
  }
}
class qe extends De {
  static init() {
    super.AddTable("piece", [...Object.keys(tetrominoes)], "flexible");
    super.AddProperty("short", {
      min: 8,
      max: 16
    });
    super.AddProperty("long", {
      min: 16,
      max: 32
    });
    this._clears = [
      "singles",
      "doubles",
      "triples",
      "quads",
      "pentas",
      "realtspins",
      "minitspins",
      "minitspinsingles",
      "tspinsingles",
      "minitspindoubles",
      "tspindoubles",
      "minitspintriples",
      "tspintriples",
      "minitspinquads",
      "tspinquads",
      "tspinpentas",
      "allclear"
    ];
  }
  static encode(e, t) {
    const n = t.garbage;
    const i = t.clears;
    const s = t.finesse;
    e.writeDInt(t.lines, this.$short);
    e.writeDInt(t.level_lines, this.$short);
    e.writeDInt(t.level_lines_needed, this.$short);
    e.writeDInt(t.inputs, this.$long);
    e.writeDInt(t.holds, this.$long);
    e.writeDInt(t.score, this.$long);
    e.writeUInt(t.level, 8);
    e.writeDInt(t.combo, this.$long);
    e.writeDInt(t.topcombo, this.$long);
    e.writeUInt(t.combopower, 3);
    e.writeDInt(t.btb, this.$short);
    e.writeDInt(t.topbtb, this.$short);
    e.writeUInt(t.btbpower, 8);
    e.writeDInt(t.tspins, this.$long);
    e.writeDInt(t.piecesplaced, this.$long);
    for (const t of this._clears) {
      e.writeDInt(i[t], this.$short);
    }
    e.writeDInt(n.sent, this.$long);
    e.writeDInt(n.sent_nomult, this.$long);
    e.writeDInt(n.maxspike, this.$long);
    e.writeDInt(n.maxspike_nomult, this.$long);
    e.writeDInt(n.received, this.$long);
    e.writeDInt(n.attack, this.$long);
    e.writeDInt(n.cleared, this.$long);
    e.writeDInt(t.kills, this.$short);
    e.writeDInt(s.combo, this.$long);
    e.writeDInt(s.faults, this.$long);
    e.writeDInt(s.perfectpieces, this.$long);
    e.writeStruct(t.zenith, Ke);
  }
  static decode(e) {
    const t = {
      zenlevel: 1,
      zenprogress: 0,
      clears: {},
      garbage: {},
      finesse: {}
    };
    t.lines = e.readDInt(this.$short);
    t.level_lines = e.readDInt(this.$short);
    t.level_lines_needed = e.readDInt(this.$short);
    t.inputs = e.readDInt(this.$long);
    t.holds = e.readDInt(this.$long);
    t.score = e.readDInt(this.$long);
    t.level = e.readUInt(8);
    t.combo = e.readDInt(this.$long);
    t.topcombo = e.readDInt(this.$long);
    t.combopower = e.readUInt(3);
    t.btb = e.readDInt(this.$short);
    t.topbtb = e.readDInt(this.$short);
    t.btbpower = e.readUInt(8);
    t.tspins = e.readDInt(this.$long);
    t.piecesplaced = e.readDInt(this.$long);
    for (const n of this._clears) {
      t.clears[n] = e.readDInt(this.$short);
    }
    t.garbage.sent = e.readDInt(this.$long);
    t.garbage.sent_nomult = e.readDInt(this.$long);
    t.garbage.maxspike = e.readDInt(this.$long);
    t.garbage.maxspike_nomult = e.readDInt(this.$long);
    t.garbage.received = e.readDInt(this.$long);
    t.garbage.attack = e.readDInt(this.$long);
    t.garbage.cleared = e.readDInt(this.$long);
    t.kills = e.readDInt(this.$short);
    t.finesse.combo = e.readDInt(this.$long);
    t.finesse.faults = e.readDInt(this.$long);
    t.finesse.perfectpieces = e.readDInt(this.$long);
    t.zenith = e.readStruct(Ke);
    return t;
  }
}
class Ke extends De {
  static init() {
    super.AddProperty("long", {
      min: 16,
      max: 32
    });
  }
  static encode(e, t) {
    e.writeDouble(t.altitude);
    e.writeDouble(t.rank);
    e.writeDouble(t.peakrank);
    e.writeDouble(t.avgrankpts);
    e.writeDouble(t.totalbonus);
    e.writeFloat(t.targetingfactor, 16, 100);
    e.writeFloat(t.targetinggrace, 16, 100);
    e.writeUInt(t.floor, 4);
    e.writeUInt(t.revives, 8);
    e.writeUInt(t.revivesTotal, 8);
    e.writeBoolean(t.speedrun);
    e.writeBoolean(t.speedrun_seen);
    for (let n = 0; n < 9; n++) {
      e.writeDInt(t.splits[n], this.$long);
    }
  }
  static decode(e) {
    const t = {};
    t.altitude = e.readDouble();
    t.rank = e.readDouble();
    t.peakrank = e.readDouble();
    t.avgrankpts = e.readDouble();
    t.totalbonus = e.readDouble();
    t.targetingfactor = e.readFloat(16, 100);
    t.targetinggrace = e.readFloat(16, 100);
    t.floor = e.readUInt(4);
    t.revives = e.readUInt(8);
    t.revivesTotal = e.readUInt(8);
    t.revivesMaxOfBoth = Math.max(t.revives, t.revivesTotal - t.revives);
    t.speedrun = e.readBoolean();
    t.speedrun_seen = e.readBoolean();
    t.splits = [];
    for (let n = 0; n < 9; n++) {
      t.splits[n] = e.readDInt(this.$long);
    }
    return t;
  }
}
class je extends De {
  static init() {
    super.AddProperty("byte", {
      min: 8,
      max: 24
    });
    super.AddTable("type", [
      "interaction",
      "interaction_confirm",
      "target",
      "targeted",
      "allow_targeting",
      "kev",
      "custom"
    ]);
    super.AddTable("int_type", [
      "garbage",
      "zenith.climb_pts",
      "zenith.bonus",
      "zenith.incapacitated",
      "zenith.revive"
    ]);
  }
  static encode(e, t) {
    const n = t.frame;
    const i = t.type;
    const s = t.data;
    e.writeDInt(t.id, this.$byte);
    e.writeDInt(n, this.$byte);
    e.writeTable(i, this.$$type);
    switch (i) {
      case "interaction":
        return e.writeStruct(s, Ve);
      case "interaction_confirm":
        e.writeTable(s.type, this.$$int_type);
        switch (s.type) {
          case "garbage":
            return e.writeStruct(s, Ve);
          case "zenith.climb_pts":
          case "zenith.bonus":
            e.writeUInt(s.gameid, 13);
            e.writeDInt(s.frame, this.$byte);
            return e.writeDouble(s.amt);
          case "zenith.incapacitated":
          case "zenith.revive":
            e.writeUInt(s.gameid, 13);
            return e.writeDInt(s.frame, this.$byte);
          default:
            throw new Error(`Unknown interaction type received: ${s.type}`);
        }
      case "target":
        e.writeUInt(s.targets.length, 13);
        for (const t of s.targets) {
          e.writeUInt(t, 13);
        }
        break;
      case "targeted":
        e.writeBoolean(s.value);
        e.writeUInt(s.gameid, 13);
        e.writeDInt(s.frame, this.$byte);
        break;
      case "allow_targeting":
        e.writeBoolean(s.value);
        break;
      case "kev":
        e.writeUInt(s.victim.gameid, 13);
        e.writeUInt(s.killer.gameid, 13);
        e.writeDInt(s.frame, this.$byte);
        e.writeUInt(s.fire, 10);
        break;
      case "custom":
        return e.writeStruct(s, Qe);
    }
  }
  static decode(e) {
    const t = {};
    t.id = e.readDInt(this.$byte);
    t.frame = e.readDInt(this.$byte);
    t.type = e.readTable(this.$$type);
    e: switch (t.type) {
      case "interaction":
        t.data = e.readStruct(Ve);
        break;
      case "interaction_confirm": {
        const n = e.readTable(this.$$int_type);
        switch (n) {
          case "garbage":
            t.data = e.readStruct(Ve);
            break e;
          case "zenith.climb_pts":
          case "zenith.bonus":
            t.data = {
              type: n,
              gameid: e.readUInt(13),
              frame: e.readDInt(this.$byte),
              amt: e.readDouble()
            };
            break e;
          case "zenith.incapacitated":
          case "zenith.revive":
            t.data = {
              type: n,
              gameid: e.readUInt(13),
              frame: e.readDInt(this.$byte)
            };
            break e;
        }
        break;
      }
      case "target": {
        const n = [];
        const i = e.readUInt(13);
        for (let t = 0; t < i; t++) {
          n.push(e.readUInt(13));
        }
        t.data = {
          targets: n
        };
        break;
      }
      case "targeted":
        t.data = {
          value: e.readBoolean(),
          gameid: e.readUInt(13),
          frame: e.readDInt(this.$byte)
        };
        break;
      case "allow_targeting":
        t.data = {
          value: e.readBoolean()
        };
        break;
      case "kev":
        t.data = {
          victim: {
            gameid: e.readUInt(13)
          },
          killer: {
            gameid: e.readUInt(13)
          },
          frame: e.readDInt(this.$byte),
          fire: e.readUInt(10)
        };
        break;
      case "custom":
        t.data = e.readStruct(Qe);
    }
    return t;
  }
}
class Ve extends Oe {
  static init() {
    super.AddProperty("byte", {
      min: 8,
      max: 24
    });
    super.AddTable("type", ["garbage", "corruption"]);
    super.AddTable("actorType", ["none", "clears", "time", "line"]);
    super.AddTable("blk", [null, ...minocolors]);
    super.AddTable("position", [
      "aboveStack",
      "aboveUnclearable",
      "abovePerma",
      "bottom"
    ]);
    const n = {
      mode: "fixed",
      type: Ee.TYPES.Table,
      size: this.$$type
    };
    const F = {
      mode: "fixed",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const P = {
      mode: "optional",
      type: Ee.TYPES.String,
      size: true
    };
    const H = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: 13
    };
    const W = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$position
    };
    const G = {
      mode: "optional",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const U = {
      mode: "optional",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const $ = {
      mode: "optional",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const j = {
      mode: "optional",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const X = {
      mode: "optional",
      type: Ee.TYPES.Int,
      size: Ue.MAX_WIDTH
    };
    const Y = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: Ue.MAX_HEIGHT
    };
    const q = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$blk
    };
    const V = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$blk
    };
    const K = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: 24
    };
    const Q = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: Ue.MAX_WIDTH
    };
    const Z = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: 16
    };
    const J = {
      mode: "optional",
      type: Ee.TYPES.Boolean
    };
    const ee = {
      mode: "optional",
      type: Ee.TYPES.Boolean
    };
    const te = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: Ue.MAX_WIDTH
    };
    const ne = {
      mode: "optional",
      type: Ee.TYPES.Double
    };
    const ie = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const se = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const oe = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const re = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$actorType
    };
    const ae = {
      mode: "optional",
      type: Ee.TYPES.Any
    };
    const le = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$actorType
    };
    const ce = {
      mode: "optional",
      type: Ee.TYPES.Any
    };
    const he = {
      type: n,
      amt: F,
      username: P,
      gameid: H,
      position: W,
      frame: G,
      cid: U,
      iid: $,
      ackiid: j,
      x: X,
      y: Y,
      pos: q,
      neg: V,
      color: K,
      column: Q,
      delay: Z,
      queued: J,
      hardened: ee,
      size: te,
      zthalt: ne,
      actor_neg: ie,
      actor_pos: se,
      anchor: oe,
      actor_neg_data_type: re,
      actor_neg_data_amt: ae,
      actor_pos_data_type: le,
      actor_pos_data_amt: ce
    };
    super.AddStructure(he);
  }
}
class Ye extends Oe {
  static init() {
    super.AddTable("action", ["add", "remove"]);
    super.AddTable("position", [
      "aboveStack",
      "aboveUnclearable",
      "abovePerma",
      "bottom"
    ]);
    super.AddTable("actorType", ["none", "clears", "time", "line"]);
    super.AddTable("blk", [null, ...minocolors]);
    super.AddProperty("byte", {
      min: 8,
      max: 32
    });
    const O = {
      mode: "fixed",
      type: Ee.TYPES.Table,
      size: this.$$action
    };
    const D = {
      mode: "fixed",
      type: Ee.TYPES.DInt,
      size: this.$byte
    };
    const z = {
      mode: "fixed",
      type: Ee.TYPES.UInt,
      size: Ue.MAX_WIDTH
    };
    const I = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$blk
    };
    const R = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$blk
    };
    const P = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$position
    };
    const H = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: Ue.MAX_WIDTH
    };
    const N = {
      mode: "optional",
      type: Ee.TYPES.UInt,
      size: 16
    };
    const W = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const G = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const U = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const $ = {
      mode: "optional",
      type: Ee.TYPES.String
    };
    const j = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$actorType
    };
    const X = {
      mode: "optional",
      type: Ee.TYPES.Any
    };
    const Y = {
      mode: "optional",
      type: Ee.TYPES.Table,
      size: this.$$actorType
    };
    const q = {
      mode: "optional",
      type: Ee.TYPES.Any
    };
    const V = {
      action: O,
      amt: D,
      size: z,
      pos: I,
      neg: R,
      position: P,
      column: H,
      slow: N,
      effect: W,
      actor_neg: G,
      actor_pos: U,
      anchor: $,
      actor_neg_data_type: j,
      actor_neg_data_amt: X,
      actor_pos_data_type: Y,
      actor_pos_data_amt: q
    };
    super.AddStructure(V);
  }
}
class Qe extends De {
  static init() {
    super.AddTable("type", [
      "garbage",
      "map",
      "queue",
      "piece",
      "lines",
      "boardsize",
      "boardresize",
      "holderstate",
      "setoptions",
      "constants",
      "tetrominoes"
    ]);
  }
  static encode(e, { type: t, data: n }) {
    e.writeTable(t, this.$$type);
    switch (t) {
      case "garbage":
        return e.writeStruct(n, Ve);
      case "map":
        e.writeStruct(n.map, Ze);
        e.writeUInt(n.w, Ue.MAX_WIDTH);
        return e.writeUInt(n.h, Ue.MAX_HEIGHT);
      case "queue":
        e.writeBoolean(n.start);
        return e.writeString(n.queue.toString());
      case "piece":
        return e.writeString(n.piece);
      case "lines":
        return e.writeStruct(n, Ye);
      case "boardsize":
      case "boardresize":
        e.writeUInt(n.w, Ue.MAX_WIDTH);
        return e.writeUInt(n.h, Ue.MAX_HEIGHT);
      case "holderstate":
      case "constants":
        return e.pack(n);
      case "setoptions":
        return e.writeStruct(n.options, et);
      case "tetrominoes":
        return e.writeStruct(n, Je);
    }
  }
  static decode(e) {
    const t = {};
    t.type = e.readTable(this.$$type);
    t.data = {};
    switch (t.type) {
      case "garbage":
        t.data = e.readStruct(Ve);
        break;
      case "map":
        t.data.map = e.readStruct(Ze);
        t.data.w = e.readUInt(Ue.MAX_WIDTH);
        t.data.h = e.readUInt(Ue.MAX_HEIGHT);
        break;
      case "queue":
        t.data.start = e.readBoolean();
        t.data.queue = e.readString().split(",");
        break;
      case "piece":
        t.data.piece = e.readString();
        break;
      case "lines":
        t.data = e.readStruct(Ye);
        break;
      case "boardsize":
      case "boardresize":
        t.data.w = e.readUInt(Ue.MAX_WIDTH);
        t.data.h = e.readUInt(Ue.MAX_HEIGHT);
        break;
      case "holderstate":
      case "constants":
        t.data = e.unpack();
        break;
      case "setoptions":
        t.data.options = e.readStruct(et);
        break;
      case "tetrominoes":
        t.data = e.readStruct(Je);
    }
    return t;
  }
}
class Ze extends De {
  static init() {
    super.AddTable(
      "letters",
      ["?", ",", "_", "#", "@", "z", "l", "o", "s", "i", "j", "t", "g", "d"],
      "flexible"
    );
    super.AddProperty("word", {
      min: 16,
      max: 32
    });
  }
  static encode(e, t) {
    const n = t.split("");
    e.writeDInt(n.length, this.$word);
    for (const t of n) {
      e.writeTable(t, this.$$letters);
    }
  }
  static decode(e) {
    let t = "";
    const n = e.readDInt(this.$word);
    for (let i = 0; i < n; i++) {
      t += e.readTable(this.$$letters);
    }
    return t;
  }
}
class Je extends De {
  static init() {
    super.AddProperty("tiny", {
      min: 3,
      max: 7
    });
    super.AddTable(
      "spinbonus",
      [...Object.keys(spinbonuses_rules)],
      "flexible"
    );
    super.AddTable("colors", [...minocolors]);
    super.AddTable("kicksets", [...Object.keys(kicksets)], "flexible");
    super.AddTable("special", ["i", "i2", "i3", "l3", "i5", "oo"]);
  }
  static encode(e, t) {
    const n = t.tetrominoes;
    const i = t.minotypes;
    const s = t.tetrominoes_color;
    const o = Object.keys(n);
    e.writeUInt(o.length, 8);
    for (const t of o) {
      e.writeString(t);
    }
    for (const [t, o] of Object.entries(n)) {
      const { matrix: n, preview: r } = o;
      e.writeDInt(n.w, this.$tiny);
      e.writeDInt(n.h, this.$tiny);
      e.writeUInt(n.dx, 5);
      e.writeUInt(n.dy, 5);
      e.writeDInt(n.data[0].length, this.$tiny);
      const [a, l] = [Ee.cla32(n.w - 1), Ee.cla32(n.h - 1)];
      for (const t of n.data) {
        for (const [n, i] of t) {
          e.writeUInt(n, a);
          e.writeUInt(i, l);
        }
      }
      e.writeDInt(r.w, this.$tiny);
      e.writeDInt(r.h, this.$tiny);
      for (const [t, n] of r.data) {
        e.writeUInt(t, a);
        e.writeUInt(n, l);
      }
      e.writeBoolean(o.weight !== undefined);
      e.writeBoolean(o.spinbonus_override);
      e.writeBoolean(o.kickset_override);
      e.writeBoolean(o.kickset_special);
      e.writeBoolean(i.includes(t));
      e.writeTable(s[t], this.$$colors);
      if (o.weight !== undefined) {
        e.writeDInt(o.weight, this.$tiny);
      }
      if (o.spinbonus_override) {
        e.writeTable(o.spinbonus_override.rule, this.$$spinbonus);
        e.writeBoolean(o.spinbonus_override.mini);
      }
      if (o.kickset_override) {
        e.writeTable(o.kickset_override, this.$$kicksets);
      }
      if (o.kickset_special) {
        e.writeTable(o.kickset_special, this.$$special);
      }
    }
  }
  static decode(e) {
    const t = {};
    const n = [];
    const i = {};
    const s = e.readUInt(8);
    const o = [];
    for (let n = 0; n < s; n++) {
      const n = e.readString();
      t[n] = {
        matrix: {},
        preview: {}
      };
      o.push(n);
    }
    for (const s of o) {
      const o = t[s];
      const { matrix: r, preview: a } = o;
      r.w = e.readDInt(this.$tiny);
      r.h = e.readDInt(this.$tiny);
      r.dx = e.readUInt(5);
      r.dy = e.readUInt(5);
      const l = e.readDInt(this.$tiny);
      const [c, h] = [Ee.cla32(r.w - 1), Ee.cla32(r.h - 1)];
      r.data = [];
      for (let t = 0; t < 4; t++) {
        r.data[t] = [];
        for (let n = 0; n < l; n++) {
          const [i, s] = [e.readUInt(c), e.readUInt(h)];
          r.data[t][n] = [i, s];
        }
      }
      a.w = e.readDInt(this.$tiny);
      a.h = e.readDInt(this.$tiny);
      a.data = [];
      for (let t = 0; t < l; t++) {
        const [n, i] = [e.readUInt(c), e.readUInt(h)];
        a.data[t] = [n, i];
      }
      const u = e.readBoolean();
      const p = e.readBoolean();
      const d = e.readBoolean();
      const _ = e.readBoolean();
      const f = e.readBoolean();
      i[s] = e.readTable(this.$$colors);
      if (u) {
        o.weight = e.readDInt(this.$tiny);
      }
      if (p) {
        o.spinbonus_override = {
          rule: e.readTable(this.$$spinbonus),
          mini: e.readBoolean()
        };
      }
      if (d) {
        o.kickset_override = e.readTable(this.$$kicksets);
      }
      if (_) {
        o.kickset_special = e.readTable(this.$$special);
      }
      if (f) {
        n.push(s);
      }
    }
    return {
      minotypes: n,
      tetrominoes: t,
      tetrominoes_color: i
    };
  }
}
class et extends De {
  static TypeOrders = [
    "boolean",
    "number",
    "table",
    "object",
    "array",
    "string"
  ];
  static OptsBook = OptionsList;
  static init() {
    super.AddTable("options", Object.keys(this.OptsBook));
    super.AddTable(
      "minoskin",
      ["i", "j", "l", "o", "s", "t", "z", "ghost", "other"],
      "flexible"
    );
    super.AddTable("skins", ["tetrio", "_bombs", "connected_test"], "flexible");
    super.AddTable("ixs", ["off", "hold", "tap"]);
    for (const [e, t] of Object.entries(this.OptsBook)) {
      if (t.allowed) {
        super.AddTable("_" + e, t.allowed);
      } else if (t.possibles) {
        super.AddTable("_" + e, t.possibles, "flexible");
      }
    }
  }
  static *ParseOptions(e) {
    const { TypeOrders: t, OptsBook: n } = this;
    const i = Object.keys(e);
    for (const s of t) {
      for (const t of i) {
        const i = n[t];
        if (i.type !== s) {
          continue;
        }
        const o = e[t];
        yield [t, o, i];
      }
    }
  }
  static encode(e, t) {
    for (const [n, i, s] of this.ParseOptions(t)) {
      e.writeTable(n, this.$$options);
      switch (s.type) {
        case "object":
          if (n === "handling") {
            e.writeFloat(i.arr, 6, 10);
            e.writeUInt(i.sdf, 6);
            e.writeBoolean(i.safelock);
            e.writeBoolean(i.cancel);
            e.writeBoolean(i.may20g);
            e.writeFloat(i.das, 8, 10);
            e.writeFloat(i.dcd, 8, 10);
            e.writeTable(i.irs, this.$$ixs);
            e.writeTable(i.ihs, this.$$ixs);
          } else if (n === "minoskin") {
            e.writeUInt(Object.keys(i).length, 8);
            for (const [t, n] of Object.entries(i)) {
              e.writeTable(t, this.$$minoskin);
              e.writeTable(n, this.$$skins);
            }
          }
          break;
        case "array":
          e.writeArray(i);
          break;
        case "boolean":
          e.writeBoolean(i);
          break;
        case "table":
          e.writeTable(i, this[`$$_${n}`], s.mode);
          break;
        case "number":
          e.writeNumber(i);
          break;
        case "string":
          e.writeString(i);
          break;
        default:
          throw new TypeError(
            `Unknown type for key: ${n} value: ${i} | got -> ${s.type}`
          );
      }
    }
    e.writeTable(null, this.$$options);
  }
  static decode(e) {
    const t = this.$$options.size;
    const n = this.OptsBook;
    const i = {};
    let s = null;
    let o = null;
    for (let r = e.peek(t); r !== 0; r = e.peek(t)) {
      const t = e.readTable(this.$$options);
      const r = n[t]?.type;
      switch (r) {
        case "object":
          if (t === "handling") {
            const n = {};
            n.arr = e.readFloat(6, 10);
            n.sdf = e.readUInt(6);
            n.safelock = e.readBoolean();
            n.cancel = e.readBoolean();
            n.may20g = e.readBoolean();
            n.das = e.readFloat(8, 10);
            n.dcd = e.readFloat(8, 10);
            n.irs = e.readTable(this.$$ixs);
            n.ihs = e.readTable(this.$$ixs);
            i[t] = n;
          } else if (t === "minoskin") {
            const n = {};
            const s = e.readUInt(8);
            i[t] = n;
            for (let t = 0; t < s; t++) {
              const t = e.readTable(this.$$minoskin);
              const i = e.readTable(this.$$skins);
              n[t] = i;
            }
          }
          break;
        case "array":
          i[t] = e.readArray();
          break;
        case "boolean":
          i[t] = e.readBoolean();
          break;
        case "table":
          i[t] = e.readTable(this[`$$_${t}`]);
          break;
        case "number":
          i[t] = e.readNumber();
          break;
        case "string":
          i[t] = e.readString();
          break;
        default:
          console.error("Options dump: ", i);
          throw new TypeError(
            `Unknown type for key: ${t} | got -> ${r}\nLast Key: ${s}\nLast Value: ${o}\n`
          );
      }
      s = t;
      o = i[t];
    }
    e.seek(t, 2);
    return i;
  }
}
class tt extends et {
  static *ParseOptions(e) {
    for (const [n, i, s] of super.ParseOptions(e)) {
      if (s.default !== i) {
        if (s.type !== "object" || !strictShallowEqual(s.default, i)) {
          yield [n, i, s];
        }
      }
    }
  }
}
class nt extends De {
  static init() {
    super.AddExtension(this, {
      ownBuffer: true
    });
    super.AddTable("gor", [
      null,
      "topout",
      "garbagesmash",
      "zenith",
      "clear",
      "topout_clear",
      "winner",
      "forfeit",
      "retry",
      "drop",
      "dropnow",
      "disconnect"
    ]);
  }
  static encode(e, t) {
    const n = t.successful;
    const i = t.gameoverreason;
    const s = t.killer.gameid;
    const o = t.killer.type === "spark";
    const r = t.killer.username ?? "";
    const { apm: a, pps: l, vsscore: c } = t.aggregatestats;
    const { game: h, stats: u, diyusi: p } = t;
    e.writeBoolean(n);
    e.writeTable(i, this.$$gor);
    e.writeUInt(s, 13);
    e.writeBoolean(o, 1);
    e.writeString(r);
    e.writeStruct(t.options, tt);
    e.writeDouble(a);
    e.writeDouble(l);
    e.writeDouble(c);
    e.writeStruct(
      {
        game: h,
        stats: u,
        diyusi: p
      },
      $e
    );
  }
  static decode(e) {
    const t = {
      killer: {},
      aggregatestats: {}
    };
    t.successful = e.readBoolean();
    t.gameoverreason = e.readTable(this.$$gor);
    t.killer.gameid = e.readUInt(13);
    t.killer.type = e.readBoolean() ? "spark" : "sizzle";
    t.killer.username = e.readString();
    t.options = e.readStruct(tt);
    t.aggregatestats.apm = e.readDouble();
    t.aggregatestats.pps = e.readDouble();
    t.aggregatestats.vsscore = e.readDouble();
    Object.assign(t, e.readStruct($e));
    return t;
  }
}
Ee.init();
Pe.init();
We.init();
He.init();
Re.init();
Ne.init();
$e.init();
Ue.init();
Xe.init();
qe.init();
Ke.init();
je.init();
Ve.init();
Ye.init();
Qe.init();
Je.init();
Ze.init();
et.init();
nt.init();
De.LoadExtensions(r);
Le.SetMsgpackr(ke, we);

export { Le as CandorCodec };
