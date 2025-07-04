// @ts-nocheck
import { Buffer } from "buffer/index.js";

export default (function (t) {
  "use strict";
  var n, r, i;
  try {
    n = new TextDecoder();
  } catch (t) {}
  var a,
    o,
    s,
    u,
    c,
    l = 0,
    h = {},
    p = 0,
    f = 0,
    d = [],
    m = { useRecords: !1, mapsAsObjects: !0 };
  class g {}
  const v = new g();
  v.name = "MessagePack 0xC1";
  var y = !1,
    b = 2;
  try {
    new Function("");
  } catch (t) {
    b = 1 / 0;
  }
  class x {
    constructor(t) {
      (t &&
        (!1 === t.useRecords &&
          void 0 === t.mapsAsObjects &&
          (t.mapsAsObjects = !0),
        t.sequential &&
          !1 !== t.trusted &&
          ((t.trusted = !0),
          t.structures ||
            0 == t.useRecords ||
            ((t.structures = []),
            t.maxSharedStructures || (t.maxSharedStructures = 0))),
        t.structures
          ? (t.structures.sharedLength = t.structures.length)
          : t.getStructures &&
            (((t.structures = []).uninitialized = !0),
            (t.structures.sharedLength = 0)),
        t.int64AsNumber && (t.int64AsType = "number")),
        Object.assign(this, t));
    }
    unpack(t, n) {
      if (r)
        return Y(
          () => (
            Z(),
            this ? this.unpack(t, n) : x.prototype.unpack.call(m, t, n)
          )
        );
      (t.buffer ||
        t.constructor !== ArrayBuffer ||
        (t = void 0 !== e ? e.from(t) : new Uint8Array(t)),
        "object" == typeof n
          ? ((i = n.end || t.length), (l = n.start || 0))
          : ((l = 0), (i = n > -1 ? n : t.length)),
        (f = 0),
        (o = null),
        (s = null),
        (r = t));
      try {
        c =
          t.dataView ||
          (t.dataView = new DataView(t.buffer, t.byteOffset, t.byteLength));
      } catch (e) {
        if (((r = null), t instanceof Uint8Array)) throw e;
        throw new Error(
          "Source must be a Uint8Array or Buffer but was a " +
            (t && "object" == typeof t ? t.constructor.name : typeof t)
        );
      }
      if (this instanceof x) {
        if (((h = this), this.structures)) return ((a = this.structures), w(n));
        (!a || a.length > 0) && (a = []);
      } else ((h = m), (!a || a.length > 0) && (a = []));
      return w(n);
    }
    unpackMultiple(t, e) {
      let n,
        r = 0;
      try {
        y = !0;
        let i = t.length,
          a = this ? this.unpack(t, i) : Q.unpack(t, i);
        if (!e) {
          for (n = [a]; l < i; ) ((r = l), n.push(w()));
          return n;
        }
        if (!1 === e(a, r, l)) return;
        for (; l < i; ) if (((r = l), !1 === e(w(), r, l))) return;
      } catch (t) {
        throw ((t.lastPosition = r), (t.values = n), t);
      } finally {
        ((y = !1), Z());
      }
    }
    _mergeStructures(t, e) {
      ((t = t || []), Object.isFrozen(t) && (t = t.map((t) => t.slice(0))));
      for (let e = 0, n = t.length; e < n; e++) {
        let n = t[e];
        n && ((n.isShared = !0), e >= 32 && (n.highByte = (e - 32) >> 5));
      }
      t.sharedLength = t.length;
      for (let n in e || [])
        if (n >= 0) {
          let r = t[n],
            i = e[n];
          i &&
            (r && ((t.restoreStructures || (t.restoreStructures = []))[n] = r),
            (t[n] = i));
        }
      return (this.structures = t);
    }
    decode(t, e) {
      return this.unpack(t, e);
    }
  }
  function w(t) {
    try {
      if (!h.trusted && !y) {
        let t = a.sharedLength || 0;
        t < a.length && (a.length = t);
      }
      let t;
      if (
        (h.randomAccessStructure && r[l] < 64 && r[l],
        (t = S()),
        s && ((l = s.postBundlePosition), (s = null)),
        y && (a.restoreStructures = null),
        l == i)
      )
        (a && a.restoreStructures && _(),
          (a = null),
          (r = null),
          u && (u = null));
      else {
        if (l > i) throw new Error("Unexpected end of MessagePack data");
        if (!y) {
          let e;
          try {
            e = JSON.stringify(t, (t, e) =>
              "bigint" == typeof e ? `${e}n` : e
            ).slice(0, 100);
          } catch (t) {
            e = "(JSON view not available " + t + ")";
          }
          throw new Error("Data read, but end of buffer not reached " + e);
        }
      }
      return t;
    } catch (t) {
      throw (
        a && a.restoreStructures && _(),
        Z(),
        (t instanceof RangeError ||
          t.message.startsWith("Unexpected end of buffer") ||
          l > i) &&
          (t.incomplete = !0),
        t
      );
    }
  }
  function _() {
    for (let t in a.restoreStructures) a[t] = a.restoreStructures[t];
    a.restoreStructures = null;
  }
  function S() {
    let t = r[l++];
    if (t < 160) {
      if (t < 128) {
        if (t < 64) return t;
        {
          let e = a[63 & t] || (h.getStructures && I()[63 & t]);
          return e ? (e.read || (e.read = E(e, 63 & t)), e.read()) : t;
        }
      }
      if (t < 144) {
        if (((t -= 128), h.mapsAsObjects)) {
          let e = {};
          for (let n = 0; n < t; n++) {
            let t = W();
            ("__proto__" === t && (t = "__proto_"), (e[t] = S()));
          }
          return e;
        }
        {
          let e = new Map();
          for (let n = 0; n < t; n++) e.set(S(), S());
          return e;
        }
      }
      {
        t -= 144;
        let e = new Array(t);
        for (let n = 0; n < t; n++) e[n] = S();
        return h.freezeData ? Object.freeze(e) : e;
      }
    }
    if (t < 192) {
      let e = t - 160;
      if (f >= l) return o.slice(l - p, (l += e) - p);
      if (0 == f && i < 140) {
        let t = e < 16 ? L(e) : P(e);
        if (null != t) return t;
      }
      return A(e);
    }
    {
      let e;
      switch (t) {
        case 192:
          return null;
        case 193:
          return s
            ? ((e = S()),
              e > 0
                ? s[1].slice(s.position1, (s.position1 += e))
                : s[0].slice(s.position0, (s.position0 -= e)))
            : v;
        case 194:
          return !1;
        case 195:
          return !0;
        case 196:
          if (((e = r[l++]), void 0 === e))
            throw new Error("Unexpected end of buffer");
          return z(e);
        case 197:
          return ((e = c.getUint16(l)), (l += 2), z(e));
        case 198:
          return ((e = c.getUint32(l)), (l += 4), z(e));
        case 199:
          return U(r[l++]);
        case 200:
          return ((e = c.getUint16(l)), (l += 2), U(e));
        case 201:
          return ((e = c.getUint32(l)), (l += 4), U(e));
        case 202:
          if (((e = c.getFloat32(l)), h.useFloat32 > 2)) {
            let t = $[((127 & r[l]) << 1) | (r[l + 1] >> 7)];
            return ((l += 4), ((t * e + (e > 0 ? 0.5 : -0.5)) | 0) / t);
          }
          return ((l += 4), e);
        case 203:
          return ((e = c.getFloat64(l)), (l += 8), e);
        case 204:
          return r[l++];
        case 205:
          return ((e = c.getUint16(l)), (l += 2), e);
        case 206:
          return ((e = c.getUint32(l)), (l += 4), e);
        case 207:
          return (
            "number" === h.int64AsType
              ? ((e = 4294967296 * c.getUint32(l)), (e += c.getUint32(l + 4)))
              : "string" === h.int64AsType
                ? (e = c.getBigUint64(l).toString())
                : "auto" === h.int64AsType
                  ? ((e = c.getBigUint64(l)),
                    e <= BigInt(2) << BigInt(52) && (e = Number(e)))
                  : (e = c.getBigUint64(l)),
            (l += 8),
            e
          );
        case 208:
          return c.getInt8(l++);
        case 209:
          return ((e = c.getInt16(l)), (l += 2), e);
        case 210:
          return ((e = c.getInt32(l)), (l += 4), e);
        case 211:
          return (
            "number" === h.int64AsType
              ? ((e = 4294967296 * c.getInt32(l)), (e += c.getUint32(l + 4)))
              : "string" === h.int64AsType
                ? (e = c.getBigInt64(l).toString())
                : "auto" === h.int64AsType
                  ? ((e = c.getBigInt64(l)),
                    e >= BigInt(-2) << BigInt(52) &&
                      e <= BigInt(2) << BigInt(52) &&
                      (e = Number(e)))
                  : (e = c.getBigInt64(l)),
            (l += 8),
            e
          );
        case 212:
          if (((e = r[l++]), 114 == e)) return j(63 & r[l++]);
          {
            let t = d[e];
            if (t)
              return t.read
                ? (l++, t.read(S()))
                : t.noBuffer
                  ? (l++, t())
                  : t(r.subarray(l, ++l));
            throw new Error("Unknown extension " + e);
          }
        case 213:
          return ((e = r[l]), 114 == e ? (l++, j(63 & r[l++], r[l++])) : U(2));
        case 214:
          return U(4);
        case 215:
          return U(8);
        case 216:
          return U(16);
        case 217:
          return ((e = r[l++]), f >= l ? o.slice(l - p, (l += e) - p) : N(e));
        case 218:
          return (
            (e = c.getUint16(l)),
            f >= (l += 2) ? o.slice(l - p, (l += e) - p) : C(e)
          );
        case 219:
          return (
            (e = c.getUint32(l)),
            f >= (l += 4) ? o.slice(l - p, (l += e) - p) : R(e)
          );
        case 220:
          return ((e = c.getUint16(l)), (l += 2), D(e));
        case 221:
          return ((e = c.getUint32(l)), (l += 4), D(e));
        case 222:
          return ((e = c.getUint16(l)), (l += 2), M(e));
        case 223:
          return ((e = c.getUint32(l)), (l += 4), M(e));
        default:
          if (t >= 224) return t - 256;
          if (void 0 === t) {
            let t = new Error("Unexpected end of MessagePack data");
            throw ((t.incomplete = !0), t);
          }
          throw new Error("Unknown MessagePack token " + t);
      }
    }
  }
  const T = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
  function E(t, e) {
    function n() {
      if (n.count++ > b) {
        let n = (t.read = new Function(
          "r",
          "return function(){return " +
            (h.freezeData ? "Object.freeze" : "") +
            "({" +
            t
              .map((t) =>
                "__proto__" === t
                  ? "__proto_:r()"
                  : T.test(t)
                    ? t + ":r()"
                    : "[" + JSON.stringify(t) + "]:r()"
              )
              .join(",") +
            "})}"
        )(S));
        return (0 === t.highByte && (t.read = k(e, t.read)), n());
      }
      let r = {};
      for (let e = 0, n = t.length; e < n; e++) {
        let n = t[e];
        ("__proto__" === n && (n = "__proto_"), (r[n] = S()));
      }
      return h.freezeData ? Object.freeze(r) : r;
    }
    return ((n.count = 0), 0 === t.highByte ? k(e, n) : n);
  }
  const k = (t, e) =>
    function () {
      let n = r[l++];
      if (0 === n) return e();
      let i = t < 32 ? -(t + (n << 5)) : t + (n << 5),
        o = a[i] || I()[i];
      if (!o) throw new Error("Record id is not defined for " + i);
      return (o.read || (o.read = E(o, t)), o.read());
    };
  function I() {
    let t = Y(() => ((r = null), h.getStructures()));
    return (a = h._mergeStructures(t, a));
  }
  var A = O,
    N = O,
    C = O,
    R = O;
  function O(t) {
    let e;
    if (t < 16 && (e = L(t))) return e;
    if (t > 64 && n) return n.decode(r.subarray(l, (l += t)));
    const i = l + t,
      a = [];
    for (e = ""; l < i; ) {
      const t = r[l++];
      if (128 & t)
        if (192 == (224 & t)) {
          const e = 63 & r[l++];
          a.push(((31 & t) << 6) | e);
        } else if (224 == (240 & t)) {
          const e = 63 & r[l++],
            n = 63 & r[l++];
          a.push(((31 & t) << 12) | (e << 6) | n);
        } else if (240 == (248 & t)) {
          let e =
            ((7 & t) << 18) |
            ((63 & r[l++]) << 12) |
            ((63 & r[l++]) << 6) |
            (63 & r[l++]);
          (e > 65535 &&
            ((e -= 65536),
            a.push(((e >>> 10) & 1023) | 55296),
            (e = 56320 | (1023 & e))),
            a.push(e));
        } else a.push(t);
      else a.push(t);
      a.length >= 4096 && ((e += F.apply(String, a)), (a.length = 0));
    }
    return (a.length > 0 && (e += F.apply(String, a)), e);
  }
  function D(t) {
    let e = new Array(t);
    for (let n = 0; n < t; n++) e[n] = S();
    return h.freezeData ? Object.freeze(e) : e;
  }
  function M(t) {
    if (h.mapsAsObjects) {
      let e = {};
      for (let n = 0; n < t; n++) {
        let t = W();
        ("__proto__" === t && (t = "__proto_"), (e[t] = S()));
      }
      return e;
    }
    {
      let e = new Map();
      for (let n = 0; n < t; n++) e.set(S(), S());
      return e;
    }
  }
  var F = String.fromCharCode;
  function P(t) {
    let e = l,
      n = new Array(t);
    for (let i = 0; i < t; i++) {
      const t = r[l++];
      if ((128 & t) > 0) return void (l = e);
      n[i] = t;
    }
    return F.apply(String, n);
  }
  function L(t) {
    if (t < 4) {
      if (t < 2) {
        if (0 === t) return "";
        {
          let t = r[l++];
          return (128 & t) > 1 ? void (l -= 1) : F(t);
        }
      }
      {
        let e = r[l++],
          n = r[l++];
        if ((128 & e) > 0 || (128 & n) > 0) return void (l -= 2);
        if (t < 3) return F(e, n);
        let i = r[l++];
        return (128 & i) > 0 ? void (l -= 3) : F(e, n, i);
      }
    }
    {
      let e = r[l++],
        n = r[l++],
        i = r[l++],
        a = r[l++];
      if ((128 & e) > 0 || (128 & n) > 0 || (128 & i) > 0 || (128 & a) > 0)
        return void (l -= 4);
      if (t < 6) {
        if (4 === t) return F(e, n, i, a);
        {
          let t = r[l++];
          return (128 & t) > 0 ? void (l -= 5) : F(e, n, i, a, t);
        }
      }
      if (t < 8) {
        let o = r[l++],
          s = r[l++];
        if ((128 & o) > 0 || (128 & s) > 0) return void (l -= 6);
        if (t < 7) return F(e, n, i, a, o, s);
        let u = r[l++];
        return (128 & u) > 0 ? void (l -= 7) : F(e, n, i, a, o, s, u);
      }
      {
        let o = r[l++],
          s = r[l++],
          u = r[l++],
          c = r[l++];
        if ((128 & o) > 0 || (128 & s) > 0 || (128 & u) > 0 || (128 & c) > 0)
          return void (l -= 8);
        if (t < 10) {
          if (8 === t) return F(e, n, i, a, o, s, u, c);
          {
            let t = r[l++];
            return (128 & t) > 0 ? void (l -= 9) : F(e, n, i, a, o, s, u, c, t);
          }
        }
        if (t < 12) {
          let h = r[l++],
            p = r[l++];
          if ((128 & h) > 0 || (128 & p) > 0) return void (l -= 10);
          if (t < 11) return F(e, n, i, a, o, s, u, c, h, p);
          let f = r[l++];
          return (128 & f) > 0
            ? void (l -= 11)
            : F(e, n, i, a, o, s, u, c, h, p, f);
        }
        {
          let h = r[l++],
            p = r[l++],
            f = r[l++],
            d = r[l++];
          if ((128 & h) > 0 || (128 & p) > 0 || (128 & f) > 0 || (128 & d) > 0)
            return void (l -= 12);
          if (t < 14) {
            if (12 === t) return F(e, n, i, a, o, s, u, c, h, p, f, d);
            {
              let t = r[l++];
              return (128 & t) > 0
                ? void (l -= 13)
                : F(e, n, i, a, o, s, u, c, h, p, f, d, t);
            }
          }
          {
            let m = r[l++],
              g = r[l++];
            if ((128 & m) > 0 || (128 & g) > 0) return void (l -= 14);
            if (t < 15) return F(e, n, i, a, o, s, u, c, h, p, f, d, m, g);
            let v = r[l++];
            return (128 & v) > 0
              ? void (l -= 15)
              : F(e, n, i, a, o, s, u, c, h, p, f, d, m, g, v);
          }
        }
      }
    }
  }
  function B() {
    let t,
      e = r[l++];
    if (e < 192) t = e - 160;
    else
      switch (e) {
        case 217:
          t = r[l++];
          break;
        case 218:
          ((t = c.getUint16(l)), (l += 2));
          break;
        case 219:
          ((t = c.getUint32(l)), (l += 4));
          break;
        default:
          throw new Error("Expected string");
      }
    return O(t);
  }
  function z(t) {
    return h.copyBuffers
      ? Uint8Array.prototype.slice.call(r, l, (l += t))
      : r.subarray(l, (l += t));
  }
  function U(t) {
    let e = r[l++];
    if (d[e]) {
      let n,
        i = l;
      return d[e](
        r.subarray(l, (n = l += t)),
        (t) => {
          l = t;
          try {
            return S();
          } finally {
            l = n;
          }
        },
        i
      );
    }
    throw new Error("Unknown extension type " + e);
  }
  var G = new Array(4096);
  function W() {
    let t = r[l++];
    if (!(t >= 160 && t < 192)) return (l--, V(S()));
    if (((t -= 160), f >= l)) return o.slice(l - p, (l += t) - p);
    if (!(0 == f && i < 180)) return A(t);
    let e,
      n = 4095 & ((t << 5) ^ (t > 1 ? c.getUint16(l) : t > 0 ? r[l] : 0)),
      a = G[n],
      s = l,
      u = l + t - 3,
      h = 0;
    if (a && a.bytes == t) {
      for (; s < u; ) {
        if (((e = c.getUint32(s)), e != a[h++])) {
          s = 1879048192;
          break;
        }
        s += 4;
      }
      for (u += 3; s < u; )
        if (((e = r[s++]), e != a[h++])) {
          s = 1879048192;
          break;
        }
      if (s === u) return ((l = s), a.string);
      ((u -= 3), (s = l));
    }
    for (a = [], G[n] = a, a.bytes = t; s < u; )
      ((e = c.getUint32(s)), a.push(e), (s += 4));
    for (u += 3; s < u; ) ((e = r[s++]), a.push(e));
    let d = t < 16 ? L(t) : P(t);
    return (a.string = null != d ? d : A(t));
  }
  function V(t) {
    if ("string" == typeof t) return t;
    if ("number" == typeof t || "boolean" == typeof t || "bigint" == typeof t)
      return t.toString();
    if (null == t) return t + "";
    throw new Error("Invalid property type for record", typeof t);
  }
  const j = (t, e) => {
    let n = S().map(V),
      r = t;
    void 0 !== e &&
      ((t = t < 32 ? -((e << 5) + t) : (e << 5) + t), (n.highByte = e));
    let i = a[t];
    return (
      i &&
        (i.isShared || y) &&
        ((a.restoreStructures || (a.restoreStructures = []))[t] = i),
      (a[t] = n),
      (n.read = E(n, r)),
      n.read()
    );
  };
  ((d[0] = () => {}),
    (d[0].noBuffer = !0),
    (d[66] = (t) => {
      let e = t.length,
        n = BigInt(128 & t[0] ? t[0] - 256 : t[0]);
      for (let r = 1; r < e; r++) ((n <<= 8n), (n += BigInt(t[r])));
      return n;
    }));
  let H = { Error, TypeError, ReferenceError };
  ((d[101] = () => {
    let t = S();
    return (H[t[0]] || Error)(t[1]);
  }),
    (d[105] = (t) => {
      if (!1 === h.structuredClone)
        throw new Error("Structured clone extension is disabled");
      let e = c.getUint32(l - 4);
      u || (u = new Map());
      let n,
        i = r[l];
      n = (i >= 144 && i < 160) || 220 == i || 221 == i ? [] : {};
      let a = { target: n };
      u.set(e, a);
      let o = S();
      return a.used ? Object.assign(n, o) : ((a.target = o), o);
    }),
    (d[112] = (t) => {
      if (!1 === h.structuredClone)
        throw new Error("Structured clone extension is disabled");
      let e = c.getUint32(l - 4),
        n = u.get(e);
      return ((n.used = !0), n.target);
    }),
    (d[115] = () => new Set(S())));
  const X = [
    "Int8",
    "Uint8",
    "Uint8Clamped",
    "Int16",
    "Uint16",
    "Int32",
    "Uint32",
    "Float32",
    "Float64",
    "BigInt64",
    "BigUint64"
  ].map((t) => t + "Array");
  let q = "object" == typeof globalThis ? globalThis : window;
  ((d[116] = (t) => {
    let e = t[0],
      n = X[e];
    if (!n) {
      if (16 === e) {
        let e = new ArrayBuffer(t.length - 1);
        return (new Uint8Array(e).set(t.subarray(1)), e);
      }
      throw new Error("Could not find typed array for code " + e);
    }
    return new q[n](Uint8Array.prototype.slice.call(t, 1).buffer);
  }),
    (d[120] = () => {
      let t = S();
      return new RegExp(t[0], t[1]);
    }));
  const K = [];
  function Y(t) {
    let e = i,
      n = l,
      d = p,
      m = f,
      g = o,
      v = u,
      b = s,
      x = new Uint8Array(r.slice(0, i)),
      w = a,
      _ = a.slice(0, a.length),
      S = h,
      T = y,
      E = t();
    return (
      (i = e),
      (l = n),
      (p = d),
      (f = m),
      (o = g),
      (u = v),
      (s = b),
      (r = x),
      (y = T),
      (a = w).splice(0, a.length, ..._),
      (h = S),
      (c = new DataView(r.buffer, r.byteOffset, r.byteLength)),
      E
    );
  }
  function Z() {
    ((r = null), (u = null), (a = null));
  }
  ((d[98] = (t) => {
    let e = (t[0] << 24) + (t[1] << 16) + (t[2] << 8) + t[3],
      n = l;
    return (
      (l += e - t.length),
      (s = K),
      ((s = [B(), B()]).position0 = 0),
      (s.position1 = 0),
      (s.postBundlePosition = l),
      (l = n),
      S()
    );
  }),
    (d[255] = (t) =>
      4 == t.length
        ? new Date(1e3 * (16777216 * t[0] + (t[1] << 16) + (t[2] << 8) + t[3]))
        : 8 == t.length
          ? new Date(
              ((t[0] << 22) + (t[1] << 14) + (t[2] << 6) + (t[3] >> 2)) / 1e6 +
                1e3 *
                  (4294967296 * (3 & t[3]) +
                    16777216 * t[4] +
                    (t[5] << 16) +
                    (t[6] << 8) +
                    t[7])
            )
          : 12 == t.length
            ? new Date(
                ((t[0] << 24) + (t[1] << 16) + (t[2] << 8) + t[3]) / 1e6 +
                  1e3 *
                    ((128 & t[4] ? -281474976710656 : 0) +
                      1099511627776 * t[6] +
                      4294967296 * t[7] +
                      16777216 * t[8] +
                      (t[9] << 16) +
                      (t[10] << 8) +
                      t[11])
              )
            : new Date("invalid")));
  const $ = new Array(147);
  for (let t = 0; t < 256; t++)
    $[t] = +("1e" + Math.floor(45.15 - 0.30103 * t));
  const J = x;
  var Q = new x({ useRecords: !1 });
  const tt = Q.unpack,
    et = Q.unpackMultiple,
    nt = Q.unpack,
    rt = { NEVER: 0, ALWAYS: 1, DECIMAL_ROUND: 3, DECIMAL_FIT: 4 };
  let it,
    at,
    ot,
    st = new Float32Array(1),
    ut = new Uint8Array(st.buffer, 0, 4);
  try {
    it = new TextEncoder();
  } catch (t) {}
  const ct = void 0 !== Buffer,
    lt = ct
      ? function (t) {
          return Buffer.allocUnsafeSlow(t);
        }
      : Uint8Array,
    ht = ct ? Buffer : Uint8Array,
    pt = ct ? 4294967296 : 2144337920;
  let ft,
    dt,
    mt,
    gt,
    vt = 0,
    yt = null;
  const bt = /[\u0080-\uFFFF]/,
    xt = Symbol("record-id");
  class wt extends x {
    constructor(t) {
      let e, n, r, i;
      (super(t), (this.offset = 0));
      let a = ht.prototype.utf8Write
          ? function (t, e) {
              return ft.utf8Write(t, e, 4294967295);
            }
          : !(!it || !it.encodeInto) &&
            function (t, e) {
              return it.encodeInto(t, ft.subarray(e)).written;
            },
        o = this;
      t || (t = {});
      let s = t && t.sequential,
        u = t.structures || t.saveStructures,
        c = t.maxSharedStructures;
      if ((null == c && (c = u ? 32 : 0), c > 8160))
        throw new Error("Maximum maxSharedStructure is 8160");
      t.structuredClone && null == t.moreTypes && (this.moreTypes = !0);
      let l = t.maxOwnStructures;
      (null == l && (l = u ? 32 : 64),
        this.structures || 0 == t.useRecords || (this.structures = []));
      let h = c > 32 || l + c > 64,
        p = c + 64,
        f = c + l + 64;
      if (f > 8256)
        throw new Error("Maximum maxSharedStructure + maxOwnStructure is 8192");
      let d = [],
        m = 0,
        g = 0;
      this.pack = this.encode = function (t, a) {
        if (
          (ft ||
            ((ft = new lt(8192)),
            (mt =
              ft.dataView || (ft.dataView = new DataView(ft.buffer, 0, 8192))),
            (vt = 0)),
          (gt = ft.length - 10),
          gt - vt < 2048
            ? ((ft = new lt(ft.length)),
              (mt =
                ft.dataView ||
                (ft.dataView = new DataView(ft.buffer, 0, ft.length))),
              (gt = ft.length - 10),
              (vt = 0))
            : (vt = (vt + 7) & 2147483640),
          (e = vt),
          a & Pt && (vt += 255 & a),
          (i = o.structuredClone ? new Map() : null),
          o.bundleStrings && "string" != typeof t
            ? ((yt = []), (yt.size = 1 / 0))
            : (yt = null),
          (r = o.structures),
          r)
        ) {
          r.uninitialized && (r = o._mergeStructures(o.getStructures()));
          let t = r.sharedLength || 0;
          if (t > c)
            throw new Error(
              "Shared structures is larger than maximum shared structures, try increasing maxSharedStructures to " +
                r.sharedLength
            );
          if (!r.transitions) {
            r.transitions = Object.create(null);
            for (let e = 0; e < t; e++) {
              let t = r[e];
              if (!t) continue;
              let n,
                i = r.transitions;
              for (let e = 0, r = t.length; e < r; e++) {
                let r = t[e];
                ((n = i[r]), n || (n = i[r] = Object.create(null)), (i = n));
              }
              i[xt] = e + 64;
            }
            this.lastNamedStructuresLength = t;
          }
          s || (r.nextId = t + 64);
        }
        let u;
        n && (n = !1);
        try {
          o.randomAccessStructure &&
          t &&
          t.constructor &&
          t.constructor === Object
            ? I(t)
            : b(t);
          let n = yt;
          if ((yt && Et(e, b, 0), i && i.idsToInsert)) {
            let t = i.idsToInsert.sort((t, e) =>
                t.offset > e.offset ? 1 : -1
              ),
              r = t.length,
              a = -1;
            for (; n && r > 0; ) {
              let i = t[--r].offset + e;
              (i < n.stringsPosition + e && -1 === a && (a = 0),
                i > n.position + e
                  ? a >= 0 && (a += 6)
                  : (a >= 0 &&
                      (mt.setUint32(
                        n.position + e,
                        mt.getUint32(n.position + e) + a
                      ),
                      (a = -1)),
                    (n = n.previous),
                    r++));
            }
            (a >= 0 &&
              n &&
              mt.setUint32(n.position + e, mt.getUint32(n.position + e) + a),
              (vt += 6 * t.length),
              vt > gt && T(vt),
              (o.offset = vt));
            let s = (function (t, e) {
              let n,
                r = 6 * e.length,
                i = t.length - r;
              for (; (n = e.pop()); ) {
                let e = n.offset,
                  a = n.id;
                (t.copyWithin(e + r, e, i), (r -= 6));
                let o = e + r;
                ((t[o++] = 214),
                  (t[o++] = 105),
                  (t[o++] = a >> 24),
                  (t[o++] = (a >> 16) & 255),
                  (t[o++] = (a >> 8) & 255),
                  (t[o++] = 255 & a),
                  (i = e));
              }
              return t;
            })(ft.subarray(e, vt), t);
            return ((i = null), s);
          }
          return (
            (o.offset = vt),
            a & Mt ? ((ft.start = e), (ft.end = vt), ft) : ft.subarray(e, vt)
          );
        } catch (t) {
          throw ((u = t), t);
        } finally {
          if (r && (v(), n && o.saveStructures)) {
            let n = r.sharedLength || 0,
              i = ft.subarray(e, vt),
              s = (function (t, e) {
                return (
                  (t.isCompatible = (t) => {
                    let n =
                      !t || (e.lastNamedStructuresLength || 0) === t.length;
                    return (n || e._mergeStructures(t), n);
                  }),
                  t
                );
              })(r, o);
            if (!u)
              return !1 === o.saveStructures(s, s.isCompatible)
                ? o.pack(t, a)
                : ((o.lastNamedStructuresLength = n),
                  ft.length > 1073741824 && (ft = null),
                  i);
          }
          (ft.length > 1073741824 && (ft = null), a & Ft && (vt = e));
        }
      };
      const v = () => {
          g < 10 && g++;
          let t = r.sharedLength || 0;
          if ((r.length > t && !s && (r.length = t), m > 1e4))
            ((r.transitions = null),
              (g = 0),
              (m = 0),
              d.length > 0 && (d = []));
          else if (d.length > 0 && !s) {
            for (let t = 0, e = d.length; t < e; t++) d[t][xt] = 0;
            d = [];
          }
        },
        y = (t) => {
          var e = t.length;
          e < 16
            ? (ft[vt++] = 144 | e)
            : e < 65536
              ? ((ft[vt++] = 220), (ft[vt++] = e >> 8), (ft[vt++] = 255 & e))
              : ((ft[vt++] = 221), mt.setUint32(vt, e), (vt += 4));
          for (let n = 0; n < e; n++) b(t[n]);
        },
        b = (t) => {
          vt > gt && (ft = T(vt));
          var n,
            r = typeof t;
          if ("string" === r) {
            let r,
              i = t.length;
            if (yt && i >= 4 && i < 4096) {
              if ((yt.size += i) > 21760) {
                let t,
                  n,
                  r = (yt[0] ? 3 * yt[0].length + yt[1].length : 0) + 10;
                (vt + r > gt && (ft = T(vt + r)),
                  yt.position
                    ? ((n = yt),
                      (ft[vt] = 200),
                      (vt += 3),
                      (ft[vt++] = 98),
                      (t = vt - e),
                      (vt += 4),
                      Et(e, b, 0),
                      mt.setUint16(t + e - 3, vt - e - t))
                    : ((ft[vt++] = 214),
                      (ft[vt++] = 98),
                      (t = vt - e),
                      (vt += 4)),
                  (yt = ["", ""]),
                  (yt.previous = n),
                  (yt.size = 0),
                  (yt.position = t));
              }
              let n = bt.test(t);
              return (
                (yt[n ? 0 : 1] += t),
                (ft[vt++] = 193),
                void b(n ? -i : i)
              );
            }
            r = i < 32 ? 1 : i < 256 ? 2 : i < 65536 ? 3 : 5;
            let o = 3 * i;
            if ((vt + o > gt && (ft = T(vt + o)), i < 64 || !a)) {
              let e,
                a,
                o,
                s = vt + r;
              for (e = 0; e < i; e++)
                ((a = t.charCodeAt(e)),
                  a < 128
                    ? (ft[s++] = a)
                    : a < 2048
                      ? ((ft[s++] = (a >> 6) | 192), (ft[s++] = (63 & a) | 128))
                      : 55296 == (64512 & a) &&
                          56320 == (64512 & (o = t.charCodeAt(e + 1)))
                        ? ((a = 65536 + ((1023 & a) << 10) + (1023 & o)),
                          e++,
                          (ft[s++] = (a >> 18) | 240),
                          (ft[s++] = ((a >> 12) & 63) | 128),
                          (ft[s++] = ((a >> 6) & 63) | 128),
                          (ft[s++] = (63 & a) | 128))
                        : ((ft[s++] = (a >> 12) | 224),
                          (ft[s++] = ((a >> 6) & 63) | 128),
                          (ft[s++] = (63 & a) | 128)));
              n = s - vt - r;
            } else n = a(t, vt + r);
            (n < 32
              ? (ft[vt++] = 160 | n)
              : n < 256
                ? (r < 2 && ft.copyWithin(vt + 2, vt + 1, vt + 1 + n),
                  (ft[vt++] = 217),
                  (ft[vt++] = n))
                : n < 65536
                  ? (r < 3 && ft.copyWithin(vt + 3, vt + 2, vt + 2 + n),
                    (ft[vt++] = 218),
                    (ft[vt++] = n >> 8),
                    (ft[vt++] = 255 & n))
                  : (r < 5 && ft.copyWithin(vt + 5, vt + 3, vt + 3 + n),
                    (ft[vt++] = 219),
                    mt.setUint32(vt, n),
                    (vt += 4)),
              (vt += n));
          } else if ("number" === r)
            if (t >>> 0 === t)
              t < 32 ||
              (t < 128 && !1 === this.useRecords) ||
              (t < 64 && !this.randomAccessStructure)
                ? (ft[vt++] = t)
                : t < 256
                  ? ((ft[vt++] = 204), (ft[vt++] = t))
                  : t < 65536
                    ? ((ft[vt++] = 205),
                      (ft[vt++] = t >> 8),
                      (ft[vt++] = 255 & t))
                    : ((ft[vt++] = 206), mt.setUint32(vt, t), (vt += 4));
            else if ((t | 0) === t)
              t >= -32
                ? (ft[vt++] = 256 + t)
                : t >= -128
                  ? ((ft[vt++] = 208), (ft[vt++] = t + 256))
                  : t >= -32768
                    ? ((ft[vt++] = 209), mt.setInt16(vt, t), (vt += 2))
                    : ((ft[vt++] = 210), mt.setInt32(vt, t), (vt += 4));
            else {
              let e;
              if (
                (e = this.useFloat32) > 0 &&
                t < 4294967296 &&
                t >= -2147483648
              ) {
                let n;
                if (
                  ((ft[vt++] = 202),
                  mt.setFloat32(vt, t),
                  e < 4 ||
                    ((n = t * $[((127 & ft[vt]) << 1) | (ft[vt + 1] >> 7)]) |
                      0) ===
                      n)
                )
                  return void (vt += 4);
                vt--;
              }
              ((ft[vt++] = 203), mt.setFloat64(vt, t), (vt += 8));
            }
          else if ("object" === r || "function" === r)
            if (t) {
              if (i) {
                let n = i.get(t);
                if (n) {
                  if (!n.id) {
                    let t = i.idsToInsert || (i.idsToInsert = []);
                    n.id = t.push(n);
                  }
                  return (
                    (ft[vt++] = 214),
                    (ft[vt++] = 112),
                    mt.setUint32(vt, n.id),
                    void (vt += 4)
                  );
                }
                i.set(t, { offset: vt - e });
              }
              let a = t.constructor;
              if (a === Object) S(t);
              else if (a === Array) y(t);
              else if (a === Map)
                if (this.mapAsEmptyObject) ft[vt++] = 128;
                else {
                  (n = t.size) < 16
                    ? (ft[vt++] = 128 | n)
                    : n < 65536
                      ? ((ft[vt++] = 222),
                        (ft[vt++] = n >> 8),
                        (ft[vt++] = 255 & n))
                      : ((ft[vt++] = 223), mt.setUint32(vt, n), (vt += 4));
                  for (let [e, n] of t) (b(e), b(n));
                }
              else {
                for (let n = 0, r = at.length; n < r; n++) {
                  if (t instanceof ot[n]) {
                    let r = at[n];
                    if (r.write) {
                      r.type &&
                        ((ft[vt++] = 212), (ft[vt++] = r.type), (ft[vt++] = 0));
                      let e = r.write.call(this, t);
                      return void (e === t
                        ? Array.isArray(t)
                          ? y(t)
                          : S(t)
                        : b(e));
                    }
                    let i,
                      a = ft,
                      o = mt,
                      s = vt,
                      u = e;
                    ft = null;
                    try {
                      i = r.pack.call(
                        this,
                        t,
                        (t) => (
                          (ft = a),
                          (a = null),
                          (vt += t),
                          vt > gt && T(vt),
                          { target: ft, targetView: mt, position: vt - t }
                        ),
                        b
                      );
                    } finally {
                      a &&
                        ((ft = a),
                        (mt = o),
                        (vt = s),
                        (e = u),
                        (gt = ft.length - 10));
                    }
                    return void (
                      i &&
                      (i.length + vt > gt && T(i.length + vt),
                      (vt = Tt(i, ft, vt, r.type)))
                    );
                  }
                }
                if (Array.isArray(t)) y(t);
                else {
                  if (t.toJSON) {
                    const e = t.toJSON();
                    if (e !== t) return b(e);
                  }
                  if ("function" === r)
                    return b(this.writeFunction && this.writeFunction(t));
                  S(t);
                }
              }
            } else ft[vt++] = 192;
          else if ("boolean" === r) ft[vt++] = t ? 195 : 194;
          else if ("bigint" === r) {
            if (t < BigInt(1) << BigInt(63) && t >= -(BigInt(1) << BigInt(63)))
              ((ft[vt++] = 211), mt.setBigInt64(vt, t));
            else if (t < BigInt(1) << BigInt(64) && t > 0)
              ((ft[vt++] = 207), mt.setBigUint64(vt, t));
            else {
              if (!this.largeBigIntToFloat) {
                if (
                  this.useBigIntExtension &&
                  t < 2n ** 1023n &&
                  t > -(2n ** 1023n)
                ) {
                  ((ft[vt++] = 199), vt++, (ft[vt++] = 66));
                  let e,
                    n = [];
                  do {
                    let r = 0xffn & t;
                    ((e = (0x80n & r) === (t < 0n ? 0x80n : 0n)),
                      n.push(r),
                      (t >>= 8n));
                  } while ((0n !== t && -1n !== t) || !e);
                  ft[vt - 2] = n.length;
                  for (let t = n.length; t > 0; ) ft[vt++] = Number(n[--t]);
                  return;
                }
                throw new RangeError(
                  t +
                    " was too large to fit in MessagePack 64-bit integer format, use useBigIntExtension or set largeBigIntToFloat to convert to float-64"
                );
              }
              ((ft[vt++] = 203), mt.setFloat64(vt, Number(t)));
            }
            vt += 8;
          } else {
            if ("undefined" !== r) throw new Error("Unknown type: " + r);
            this.encodeUndefinedAsNil
              ? (ft[vt++] = 192)
              : ((ft[vt++] = 212), (ft[vt++] = 0), (ft[vt++] = 0));
          }
        },
        x =
          this.variableMapSize || this.coercibleKeyAsNumber
            ? (t) => {
                let e,
                  n = Object.keys(t),
                  r = n.length;
                if (
                  (r < 16
                    ? (ft[vt++] = 128 | r)
                    : r < 65536
                      ? ((ft[vt++] = 222),
                        (ft[vt++] = r >> 8),
                        (ft[vt++] = 255 & r))
                      : ((ft[vt++] = 223), mt.setUint32(vt, r), (vt += 4)),
                  this.coercibleKeyAsNumber)
                )
                  for (let i = 0; i < r; i++) {
                    e = n[i];
                    let r = Number(e);
                    (b(isNaN(r) ? e : r), b(t[e]));
                  }
                else for (let i = 0; i < r; i++) (b((e = n[i])), b(t[e]));
              }
            : (t) => {
                ft[vt++] = 222;
                let n = vt - e;
                vt += 2;
                let r = 0;
                for (let e in t)
                  ("function" != typeof t.hasOwnProperty ||
                    t.hasOwnProperty(e)) &&
                    (b(e), b(t[e]), r++);
                ((ft[n++ + e] = r >> 8), (ft[n + e] = 255 & r));
              },
        w =
          !1 === this.useRecords
            ? x
            : t.progressiveRecords && !h
              ? (t) => {
                  let n,
                    i,
                    a = r.transitions || (r.transitions = Object.create(null)),
                    o = vt++ - e;
                  for (let s in t)
                    if (
                      "function" != typeof t.hasOwnProperty ||
                      t.hasOwnProperty(s)
                    ) {
                      if (((n = a[s]), n)) a = n;
                      else {
                        let u = Object.keys(t),
                          c = a;
                        a = r.transitions;
                        let l = 0;
                        for (let t = 0, e = u.length; t < e; t++) {
                          let e = u[t];
                          ((n = a[e]),
                            n || ((n = a[e] = Object.create(null)), l++),
                            (a = n));
                        }
                        (o + e + 1 == vt ? (vt--, E(a, u, l)) : k(a, u, o, l),
                          (i = !0),
                          (a = c[s]));
                      }
                      b(t[s]);
                    }
                  if (!i) {
                    let n = a[xt];
                    n ? (ft[o + e] = n) : k(a, Object.keys(t), o, 0);
                  }
                }
              : (t) => {
                  let e,
                    n = r.transitions || (r.transitions = Object.create(null)),
                    i = 0;
                  for (let r in t)
                    ("function" != typeof t.hasOwnProperty ||
                      t.hasOwnProperty(r)) &&
                      ((e = n[r]),
                      e || ((e = n[r] = Object.create(null)), i++),
                      (n = e));
                  let a = n[xt];
                  a
                    ? a >= 96 && h
                      ? ((ft[vt++] = 96 + (31 & (a -= 96))),
                        (ft[vt++] = a >> 5))
                      : (ft[vt++] = a)
                    : E(n, n.__keys__ || Object.keys(t), i);
                  for (let e in t)
                    ("function" != typeof t.hasOwnProperty ||
                      t.hasOwnProperty(e)) &&
                      b(t[e]);
                },
        _ = "function" == typeof this.useRecords && this.useRecords,
        S = _
          ? (t) => {
              _(t) ? w(t) : x(t);
            }
          : w,
        T = (t) => {
          let n;
          if (t > 16777216) {
            if (t - e > pt)
              throw new Error(
                "Packed buffer would be larger than maximum buffer size"
              );
            n = Math.min(
              pt,
              4096 *
                Math.round(
                  Math.max((t - e) * (t > 67108864 ? 1.25 : 2), 4194304) / 4096
                )
            );
          } else n = (1 + (Math.max((t - e) << 2, ft.length - 1) >> 12)) << 12;
          let r = new lt(n);
          return (
            (mt = r.dataView || (r.dataView = new DataView(r.buffer, 0, n))),
            (t = Math.min(t, ft.length)),
            ft.copy ? ft.copy(r, 0, e, t) : r.set(ft.slice(e, t)),
            (vt -= e),
            (e = 0),
            (gt = r.length - 10),
            (ft = r)
          );
        },
        E = (t, e, i) => {
          let a = r.nextId;
          (a || (a = 64),
            a < p && this.shouldShareStructure && !this.shouldShareStructure(e)
              ? ((a = r.nextOwnId), a < f || (a = p), (r.nextOwnId = a + 1))
              : (a >= f && (a = p), (r.nextId = a + 1)));
          let o = (e.highByte = a >= 96 && h ? (a - 96) >> 5 : -1);
          ((t[xt] = a),
            (t.__keys__ = e),
            (r[a - 64] = e),
            a < p
              ? ((e.isShared = !0),
                (r.sharedLength = a - 63),
                (n = !0),
                o >= 0
                  ? ((ft[vt++] = 96 + (31 & a)), (ft[vt++] = o))
                  : (ft[vt++] = a))
              : (o >= 0
                  ? ((ft[vt++] = 213),
                    (ft[vt++] = 114),
                    (ft[vt++] = 96 + (31 & a)),
                    (ft[vt++] = o))
                  : ((ft[vt++] = 212), (ft[vt++] = 114), (ft[vt++] = a)),
                i && (m += g * i),
                d.length >= l && (d.shift()[xt] = 0),
                d.push(t),
                b(e)));
        },
        k = (t, n, r, i) => {
          let a = ft,
            o = vt,
            s = gt,
            u = e;
          ((ft = dt),
            (vt = 0),
            (e = 0),
            ft || (dt = ft = new lt(8192)),
            (gt = ft.length - 10),
            E(t, n, i),
            (dt = ft));
          let c = vt;
          if (((ft = a), (vt = o), (gt = s), (e = u), c > 1)) {
            let t = vt + c - 1;
            t > gt && T(t);
            let n = r + e;
            (ft.copyWithin(n + c, n + 1, vt),
              ft.set(dt.slice(0, c), n),
              (vt = t));
          } else ft[r + e] = dt[0];
        },
        I = (t) => {
          let i = undefined(
            t,
            ft,
            e,
            vt,
            r,
            T,
            (t, e, r) => {
              if (r) return (n = !0);
              vt = e;
              let i = ft;
              return (
                b(t),
                v(),
                i !== ft ? { position: vt, targetView: mt, target: ft } : vt
              );
            },
            this
          );
          if (0 === i) return S(t);
          vt = i;
        };
    }
    useBuffer(t) {
      ((ft = t),
        (mt = new DataView(ft.buffer, ft.byteOffset, ft.byteLength)),
        (vt = 0));
    }
    clearSharedData() {
      (this.structures && (this.structures = []),
        this.typedStructs && (this.typedStructs = []));
    }
  }
  function _t(t, e, n, r) {
    let i = t.byteLength;
    if (i + 1 < 256) {
      var { target: a, position: o } = n(4 + i);
      ((a[o++] = 199), (a[o++] = i + 1));
    } else if (i + 1 < 65536) {
      var { target: a, position: o } = n(5 + i);
      ((a[o++] = 200), (a[o++] = (i + 1) >> 8), (a[o++] = (i + 1) & 255));
    } else {
      var { target: a, position: o, targetView: s } = n(7 + i);
      ((a[o++] = 201), s.setUint32(o, i + 1), (o += 4));
    }
    ((a[o++] = 116),
      (a[o++] = e),
      t.buffer || (t = new Uint8Array(t)),
      a.set(new Uint8Array(t.buffer, t.byteOffset, t.byteLength), o));
  }
  function St(t, e) {
    let n = t.byteLength;
    var r, i;
    if (n < 256) {
      var { target: r, position: i } = e(n + 2);
      ((r[i++] = 196), (r[i++] = n));
    } else if (n < 65536) {
      var { target: r, position: i } = e(n + 3);
      ((r[i++] = 197), (r[i++] = n >> 8), (r[i++] = 255 & n));
    } else {
      var { target: r, position: i, targetView: a } = e(n + 5);
      ((r[i++] = 198), a.setUint32(i, n), (i += 4));
    }
    r.set(t, i);
  }
  function Tt(t, e, n, r) {
    let i = t.length;
    switch (i) {
      case 1:
        e[n++] = 212;
        break;
      case 2:
        e[n++] = 213;
        break;
      case 4:
        e[n++] = 214;
        break;
      case 8:
        e[n++] = 215;
        break;
      case 16:
        e[n++] = 216;
        break;
      default:
        i < 256
          ? ((e[n++] = 199), (e[n++] = i))
          : i < 65536
            ? ((e[n++] = 200), (e[n++] = i >> 8), (e[n++] = 255 & i))
            : ((e[n++] = 201),
              (e[n++] = i >> 24),
              (e[n++] = (i >> 16) & 255),
              (e[n++] = (i >> 8) & 255),
              (e[n++] = 255 & i));
    }
    return ((e[n++] = r), e.set(t, n), (n += i));
  }
  function Et(t, e, n) {
    if (yt.length > 0) {
      (mt.setUint32(yt.position + t, vt + n - yt.position - t),
        (yt.stringsPosition = vt - t));
      let r = yt;
      ((yt = null), e(r[0]), e(r[1]));
    }
  }
  ((ot = [
    Date,
    Set,
    Error,
    RegExp,
    ArrayBuffer,
    Object.getPrototypeOf(Uint8Array.prototype).constructor,
    g
  ]),
    (at = [
      {
        pack(t, e, n) {
          let r = t.getTime() / 1e3;
          if (
            (this.useTimestamp32 || 0 === t.getMilliseconds()) &&
            r >= 0 &&
            r < 4294967296
          ) {
            let { target: t, targetView: n, position: i } = e(6);
            ((t[i++] = 214), (t[i++] = 255), n.setUint32(i, r));
          } else if (r > 0 && r < 4294967296) {
            let { target: n, targetView: i, position: a } = e(10);
            ((n[a++] = 215),
              (n[a++] = 255),
              i.setUint32(
                a,
                4e6 * t.getMilliseconds() + ((r / 1e3 / 4294967296) | 0)
              ),
              i.setUint32(a + 4, r));
          } else if (isNaN(r)) {
            if (this.onInvalidDate) return (e(0), n(this.onInvalidDate()));
            let { target: t, targetView: r, position: i } = e(3);
            ((t[i++] = 212), (t[i++] = 255), (t[i++] = 255));
          } else {
            let { target: n, targetView: i, position: a } = e(15);
            ((n[a++] = 199),
              (n[a++] = 12),
              (n[a++] = 255),
              i.setUint32(a, 1e6 * t.getMilliseconds()),
              i.setBigInt64(a + 4, BigInt(Math.floor(r))));
          }
        }
      },
      {
        pack(t, e, n) {
          if (this.setAsEmptyObject) return (e(0), n({}));
          let r = Array.from(t),
            { target: i, position: a } = e(this.moreTypes ? 3 : 0);
          (this.moreTypes && ((i[a++] = 212), (i[a++] = 115), (i[a++] = 0)),
            n(r));
        }
      },
      {
        pack(t, e, n) {
          let { target: r, position: i } = e(this.moreTypes ? 3 : 0);
          (this.moreTypes && ((r[i++] = 212), (r[i++] = 101), (r[i++] = 0)),
            n([t.name, t.message]));
        }
      },
      {
        pack(t, e, n) {
          let { target: r, position: i } = e(this.moreTypes ? 3 : 0);
          (this.moreTypes && ((r[i++] = 212), (r[i++] = 120), (r[i++] = 0)),
            n([t.source, t.flags]));
        }
      },
      {
        pack(t, n) {
          this.moreTypes
            ? _t(t, 16, n)
            : St(ct ? e.from(t) : new Uint8Array(t), n);
        }
      },
      {
        pack(t, e) {
          let n = t.constructor;
          n !== ht && this.moreTypes ? _t(t, X.indexOf(n.name), e) : St(t, e);
        }
      },
      {
        pack(t, e) {
          let { target: n, position: r } = e(1);
          n[r] = 193;
        }
      }
    ]));
  let kt = new wt({ useRecords: !1 });
  const It = kt.pack,
    At = kt.pack,
    Nt = wt,
    { NEVER: Ct, ALWAYS: Rt, DECIMAL_ROUND: Ot, DECIMAL_FIT: Dt } = rt,
    Mt = 512,
    Ft = 1024,
    Pt = 2048;
  const Lt = function (t, n = {}) {
      if (!t || "object" != typeof t)
        throw new Error(
          "first argument must be an Iterable, Async Iterable, Iterator, Async Iterator, or a promise"
        );
      const r = new x(n);
      let i;
      const a = (t) => {
        let n;
        i && ((t = e.concat([i, t])), (i = void 0));
        try {
          n = r.unpackMultiple(t);
        } catch (e) {
          if (!e.incomplete) throw e;
          ((i = t.slice(e.lastPosition)), (n = e.values));
        }
        return n;
      };
      return "function" == typeof t[Symbol.iterator]
        ? (function* () {
            for (const e of t) yield* a(e);
          })()
        : "function" == typeof t[Symbol.asyncIterator]
          ? (async function* () {
              for await (const e of t) yield* a(e);
            })()
          : void 0;
    },
    Bt = function (t, e = {}) {
      if (t && "object" == typeof t) {
        if ("function" == typeof t[Symbol.iterator])
          return (function* (t, e) {
            const n = new wt(e);
            for (const e of t) yield n.pack(e);
          })(t, e);
        if (
          "function" == typeof t.then ||
          "function" == typeof t[Symbol.asyncIterator]
        )
          return (async function* (t, e) {
            const n = new wt(e);
            for await (const e of t) yield n.pack(e);
          })(t, e);
        throw new Error(
          "first argument must be an Iterable, Async Iterable, Iterator, Async Iterator, or a Promise"
        );
      }
      throw new Error(
        "first argument must be an Iterable, Async Iterable, or a Promise for an Async Iterable"
      );
    };
  return (
    (t.ALWAYS = Rt),
    (t.C1 = v),
    (t.DECIMAL_FIT = Dt),
    (t.DECIMAL_ROUND = Ot),
    (t.Decoder = J),
    (t.Encoder = Nt),
    (t.FLOAT32_OPTIONS = rt),
    (t.NEVER = Ct),
    (t.Packr = wt),
    (t.REUSE_BUFFER_MODE = Mt),
    (t.Unpackr = x),
    (t.addExtension = function (t) {
      if (t.Class) {
        if (!t.pack && !t.write)
          throw new Error("Extension has no pack or write function");
        if (t.pack && !t.type)
          throw new Error(
            "Extension has no type (numeric code to identify the extension)"
          );
        (ot.unshift(t.Class), at.unshift(t));
      }
      !(function (t) {
        t.unpack ? (d[t.type] = t.unpack) : (d[t.type] = t);
      })(t);
    }),
    (t.clearSource = Z),
    (t.decode = nt),
    (t.decodeIter = Lt),
    (t.encode = At),
    (t.encodeIter = Bt),
    (t.isNativeAccelerationEnabled = !1),
    (t.mapsAsObjects = !0),
    (t.pack = It),
    (t.roundFloat32 = function (t) {
      st[0] = t;
      let e = $[((127 & ut[3]) << 1) | (ut[2] >> 7)];
      return ((e * t + (t > 0 ? 0.5 : -0.5)) | 0) / e;
    }),
    (t.unpack = tt),
    (t.unpackMultiple = et),
    (t.useRecords = !1),
    t
  );
})({});
