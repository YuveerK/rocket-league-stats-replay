// Bit-aligned little-endian binary reader for Rocket League network data.
// Rockets League replays use LE bit order: within each byte, bit 0 is LSB.

const F32_BUF = Buffer.allocUnsafe(4);

export class BitReader {
  constructor(buf) {
    this.buf = buf;
    this.bytePos = 0;
    this.bitPos = 0; // bit index within current byte (0 = LSB)
  }

  isEmpty() {
    return this.bytePos >= this.buf.length;
  }

  hasBitsRemaining(n) {
    const rem = (this.buf.length - this.bytePos) * 8 - this.bitPos;
    return rem >= n;
  }

  readBit() {
    if (this.bytePos >= this.buf.length) throw new RangeError("BitReader: EOF");
    const bit = (this.buf[this.bytePos] >> this.bitPos) & 1;
    if (++this.bitPos === 8) {
      this.bitPos = 0;
      this.bytePos++;
    }
    return bit;
  }

  // Read n bits (1..32) as an unsigned 32-bit JS number.
  readBits(n) {
    let val = 0;
    for (let i = 0; i < n; i++) {
      if (this.readBit()) val |= 1 << i;
    }
    return val >>> 0;
  }

  readU8() { return this.readBits(8); }
  readU32() { return this.readBits(32); }
  readI32() { return this.readU32() | 0; }

  readI8() {
    const v = this.readBits(8);
    return v > 127 ? v - 256 : v;
  }

  readF32() {
    const u = this.readU32();
    F32_BUF.writeUInt32LE(u, 0);
    return F32_BUF.readFloatLE(0);
  }

  readU64() {
    const lo = BigInt(this.readU32());
    const hi = BigInt(this.readU32());
    return (hi << 32n) | lo;
  }

  readI64() {
    const v = this.readU64();
    return v >= 0x8000000000000000n ? v - 0x10000000000000000n : v;
  }

  // Read n bytes, bit-aligned (slow path for small n).
  readBytes(n) {
    const out = Buffer.allocUnsafe(n);
    for (let i = 0; i < n; i++) out[i] = this.readU8();
    return out;
  }

  // Variable-width integer read (see boxcars/src/bits.rs).
  // bits = bit_width(max) - 1. Reads bits bits, then conditionally one more.
  peekBitsMaxComputed(bits, max) {
    const data = this.readBits(bits);
    const up = (data + (1 << bits)) >>> 0;
    if (up >= max) return data;
    return this.readBit() !== 0 ? up : data;
  }

  // Read 1 flag bit; if set call fn(this) and return result, else return null.
  ifGet(fn) {
    return this.readBit() ? fn(this) : null;
  }
}
