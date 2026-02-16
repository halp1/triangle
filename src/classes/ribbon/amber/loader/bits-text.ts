export const bitsText = `class Bits {
  static MAX_BITS = Number.MAX_SAFE_INTEGER.toString(2).length;

  constructor(input) {
    if (typeof input === "number") {
      this.buffer = Buffer.alloc(Math.ceil(input / 8));
    } else {
      if (!(input instanceof Buffer)) {
        throw new TypeError(
          "Initialize by specifying a bit-length or referencing a Buffer"
        );
      }
      this.buffer = input;
    }
    this._length = 8 * this.buffer.length;
    this._offset = 0;
  }

  static alloc(size, fill, encoding) {
    return new Bits(Buffer.alloc(size, fill, encoding));
  }

  static from(data, encoding, length) {
    return new Bits(Buffer.from(data, encoding, length));
  }

  get eof() {
    return this._offset === this._length;
  }

  get length() {
    return this._length;
  }

  get offset() {
    return this._offset;
  }

  set offset(val) {
    if (val < 0) throw new RangeError("Cannot set offset below 0");
    if (val > this._length) {
      throw new RangeError(
        \`Cannot set offset to \${val}, buffer length is \${this._length}\`
      );
    }
    this._offset = Math.floor(val);
    return this;
  }

  get remaining() {
    return this._length - this._offset;
  }

  clear(fill = 0) {
    this.buffer.fill(fill);
    this._offset = 0;
    return this;
  }

  clearBit(pos) {
    this.insert(0, 1, pos);
    return this;
  }

  flipBit(pos) {
    const bit = 1 ^ this.peek(1, pos);
    this.modifyBit(bit, pos);
    return bit;
  }

  getBit(pos) {
    return this.peek(1, pos);
  }

  insert(value, size = 1, offset) {
    let r = typeof offset === "number" ? offset | 0 : this._offset;
    if (r + size > this._length) {
      throw new RangeError(
        \`Cannot write \${size} bits, only \${this.remaining} bit(s) left\`
      );
    }
    if (size > Bits.MAX_BITS) {
      throw new RangeError(\`Cannot write \${size} bits, max is \${Bits.MAX_BITS}\`);
    }

    let remaining = size;
    while (remaining > 0) {
      const byteIndex = r >> 3;
      const bitIndex = r & 7;
      const chunkSize = Math.min(8 - bitIndex, remaining);
      const mask = (1 << chunkSize) - 1;
      const shift = 8 - chunkSize - bitIndex;
      const chunk = ((value >>> (remaining - chunkSize)) & mask) << shift;

      this.buffer[byteIndex] = (this.buffer[byteIndex] & ~(mask << shift)) | chunk;

      r += chunkSize;
      remaining -= chunkSize;
    }
    return r;
  }

  modifyBit(value, pos) {
    this.insert(value, 1, pos);
    return this;
  }

  peek(size = 1, offset) {
    let r = typeof offset === "number" ? offset | 0 : this._offset;
    if (r + size > this._length) {
      throw new RangeError(
        \`Cannot read \${size} bits, only \${this.remaining} bit(s) left\`
      );
    }
    if (size > Bits.MAX_BITS) {
      throw new RangeError(
        \`Reading \${size} bits would overflow result, max is \${Bits.MAX_BITS}\`
      );
    }

    const bitIndex = r & 7;
    const firstSize = Math.min(8 - bitIndex, size);
    const mask = (1 << firstSize) - 1;

    let result = (this.buffer[r >> 3] >> (8 - firstSize - bitIndex)) & mask;
    r += firstSize;

    let remaining = size - firstSize;
    while (remaining >= 8) {
      result = (result << 8) | this.buffer[r >> 3];
      r += 8;
      remaining -= 8;
    }

    if (remaining > 0) {
      const shift = 8 - remaining;
      result = (result << remaining) | ((this.buffer[r >> 3] >> shift) & (255 >> shift));
    }

    return result;
  }

  read(size = 1) {
    const value = this.peek(size, this._offset);
    this._offset += size;
    return value;
  }

  seek(val, whence = 1) {
    switch (whence) {
      case 2: // relative
        this.offset += val;
        break;
      case 3: // from end
        this.offset = this.length - val;
        break;
      default: // absolute
        this.offset = val;
    }
    return this;
  }

  setBit(pos) {
    this.insert(1, 1, pos);
    return this;
  }

  skip(size) {
    return this.seek(size, 2);
  }

  testBit(pos) {
    return !!this.peek(1, pos);
  }

  toString(encoding = "utf8") {
    return this.buffer.toString(encoding);
  }

  write(value, size = 1) {
    this._offset = this.insert(value, size, this._offset);
    return this;
  }
}`;
