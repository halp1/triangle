import { Buffer } from "buffer/";

const MAX_BITS = Number.MAX_SAFE_INTEGER.toString(2).length;

export class Bits {
  public buffer: Buffer;
  private _length: number;
  private _offset: number;

  constructor(t: number | Buffer) {
    if (typeof t === "number") {
      this.buffer = Buffer.alloc(Math.ceil(t / 8));
    } else if (t instanceof Buffer) {
      this.buffer = t;
    } else {
      throw new TypeError(
        "Initialize by specifying a bit-length or referencing a Buffer"
      );
    }
    this._length = this.buffer.length * 8;
    this._offset = 0;
  }

  static alloc(t: number, r?: number, n?: number): Bits {
    return new Bits(Buffer.alloc(t, r ?? 0, n as BufferEncoding | undefined));
  }

  static from(t: any, r?: number, n?: number): Bits {
    return new Bits(Buffer.from(t, r, n));
  }

  get eof(): boolean {
    return this._offset === this._length;
  }

  get length(): number {
    return this._length;
  }

  get offset(): number {
    return this._offset;
  }

  set offset(t: number) {
    if (t < 0) {
      throw new RangeError("Cannot set offset below 0");
    }
    if (t > this._length) {
      throw new RangeError(
        `Cannot set offset to ${t}, buffer length is ${this._length}`
      );
    }
    this._offset = Math.floor(t);
  }

  get remaining(): number {
    return this._length - this._offset;
  }

  clear(t: number = 0): this {
    this.buffer.fill(t);
    this._offset = 0;
    return this;
  }

  clearBit(t: number): this {
    this.insert(0, 1, t);
    return this;
  }

  flipBit(t: number): number {
    const result = this.peek(1, t) ^ 1;
    this.modifyBit(result, t);
    return result;
  }

  getBit(t: number): number {
    return this.peek(1, t);
  }

  insert(val: number, bits: number = 1, pos?: number): number {
    let r = typeof pos === "number" ? pos | 0 : this._offset;
    if (r + bits > this._length) {
      throw new RangeError(
        `Cannot write ${bits} bits, only ${this.remaining} bit(s) left`
      );
    }
    if (bits > MAX_BITS) {
      throw new RangeError(`Cannot write ${bits} bits, max is ${MAX_BITS}`);
    }
    let i = bits;
    while (i > 0) {
      const byteIndex = r >> 3;
      const bitIndex = r & 7;
      const o = Math.min(8 - bitIndex, i);
      const mask = (1 << o) - 1;
      const shift = 8 - o - bitIndex;
      const u = ((val >>> (i - o)) & mask) << shift;
      this.buffer[byteIndex] = (this.buffer[byteIndex] & ~(mask << shift)) | u;
      r += o;
      i -= o;
    }
    return r;
  }

  modifyBit(val: number, pos: number): number {
    this.insert(val, 1, pos);
    return val;
  }

  peek(bits: number = 1, pos?: number): number {
    let e = typeof pos === "number" ? pos | 0 : this._offset;
    if (e + bits > this._length) {
      throw new RangeError(
        `Cannot read ${bits} bits, only ${this.remaining} bit(s) left`
      );
    }
    if (bits > MAX_BITS) {
      throw new RangeError(
        `Reading ${bits} bits would overflow result, max is ${MAX_BITS}`
      );
    }
    const bitOffset = e & 7;
    const i = Math.min(8 - bitOffset, bits);
    const mask = (1 << i) - 1;
    let s = (this.buffer[e >> 3] >> (8 - i - bitOffset)) & mask;
    e += i;
    let remainingBits = bits - i;
    while (remainingBits >= 8) {
      s <<= 8;
      s |= this.buffer[e >> 3];
      e += 8;
      remainingBits -= 8;
    }
    if (remainingBits > 0) {
      const shift = 8 - remainingBits;
      s <<= remainingBits;
      s |= (this.buffer[e >> 3] >> shift) & (255 >> shift);
    }
    return s;
  }

  read(bits: number = 1): number {
    const val = this.peek(bits, this._offset);
    this._offset += bits;
    return val;
  }

  seek(t: number, mode: number = 1): this {
    switch (mode) {
      case 2:
        this.offset = this._offset + t;
        break;
      case 3:
        this.offset = this.length - t;
        break;
      default:
        this.offset = t;
    }
    return this;
  }

  setBit(t: number): this {
    this.insert(1, 1, t);
    return this;
  }

  skip(t: number): this {
    return this.seek(t, 2);
  }

  testBit(t: number): boolean {
    return !!this.peek(1, t);
  }

  toString(encoding: BufferEncoding = "utf8"): string {
    return this.buffer.toString(encoding);
  }

  write(val: number, bits: number = 1): this {
    this._offset = this.insert(val, bits, this._offset);
    return this;
  }
}
