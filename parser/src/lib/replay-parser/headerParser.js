// Byte-aligned header/body parser for Rocket League .replay files.
// Matches the layout in boxcars/src/header.rs and boxcars/src/parser.rs.

class ByteReader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }

  remaining() { return this.buf.length - this.pos; }
  eof() { return this.pos >= this.buf.length; }

  readU8() {
    if (this.pos >= this.buf.length) throw new RangeError("ByteReader: EOF reading u8");
    return this.buf[this.pos++];
  }

  readI32() {
    if (this.remaining() < 4) throw new RangeError("ByteReader: EOF reading i32");
    const v = this.buf.readInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readU32() {
    if (this.remaining() < 4) throw new RangeError("ByteReader: EOF reading u32");
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }

  readF32() {
    if (this.remaining() < 4) throw new RangeError("ByteReader: EOF reading f32");
    const v = this.buf.readFloatLE(this.pos);
    this.pos += 4;
    return v;
  }

  readU64String() {
    // Read as two u32s, return as decimal string (avoids BigInt precision issues)
    if (this.remaining() < 8) throw new RangeError("ByteReader: EOF reading u64");
    const lo = BigInt(this.buf.readUInt32LE(this.pos));
    const hi = BigInt(this.buf.readUInt32LE(this.pos + 4));
    this.pos += 8;
    return String((hi << 32n) | lo);
  }

  readI64String() {
    if (this.remaining() < 8) throw new RangeError("ByteReader: EOF reading i64");
    const lo = BigInt(this.buf.readUInt32LE(this.pos));
    const hi = BigInt(this.buf.readUInt32LE(this.pos + 4));
    this.pos += 8;
    let v = (hi << 32n) | lo;
    if (v >= 0x8000000000000000n) v -= 0x10000000000000000n;
    return String(v);
  }

  readBytes(n) {
    if (this.remaining() < n) throw new RangeError(`ByteReader: EOF reading ${n} bytes`);
    const slice = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return slice;
  }

  // Rocket League string: i32 size, then chars.
  // Negative size = UTF-16LE (*-2 bytes), positive = Latin-1/ASCII.
  readStr() {
    const size = this.readI32();
    if (size === 0) return "";
    if (size < 0) {
      // UTF-16LE: each char is 2 bytes, total = -size * 2 (includes null terminator)
      const byteLen = (-size) * 2;
      const bytes = this.readBytes(byteLen);
      // Decode UTF-16LE, strip null terminator
      return bytes.slice(0, byteLen - 2).toString("utf16le");
    }
    // Latin-1: strip null terminator
    const bytes = this.readBytes(size);
    return bytes.slice(0, size - 1).toString("latin1");
  }
}

// Parse a property dictionary (rdict) from the header.
// Returns a plain JS object matching the rrrocket JSON output format.
function parseRdict(r) {
  const obj = {};
  for (;;) {
    const key = r.readStr();
    if (key === "None") break;

    const typeName = r.readStr();

    // Unknown property length field (varies by type; we read it but ignore for
    // most types since we know fixed sizes).
    const _propLen = r.readU64String();

    switch (typeName) {
      case "BoolProperty": {
        obj[key] = r.readU8() !== 0;
        break;
      }
      case "ByteProperty": {
        const kind = r.readStr();
        if (kind === "None") {
          // Skip padding byte, continue
          r.readU8();
          continue;
        }
        const value = r.readStr();
        obj[key] = { kind, value };
        break;
      }
      case "IntProperty": {
        obj[key] = r.readI32();
        break;
      }
      case "FloatProperty": {
        obj[key] = r.readF32();
        break;
      }
      case "StrProperty":
      case "NameProperty": {
        obj[key] = r.readStr();
        break;
      }
      case "QWordProperty": {
        obj[key] = r.readU64String();
        break;
      }
      case "ArrayProperty": {
        const count = r.readI32();
        const arr = [];
        for (let i = 0; i < count; i++) {
          arr.push(parseRdict(r));
        }
        obj[key] = arr;
        break;
      }
      case "StructProperty": {
        const structName = r.readStr();
        const fields = parseRdict(r);
        obj[key] = { name: structName, fields };
        break;
      }
      default:
        throw new Error(`Unknown property type: ${typeName} for key ${key}`);
    }
  }
  return obj;
}

// Parse a list of strings (shared by levels, objects, names, etc.)
function parseStringList(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(r.readStr());
  }
  return list;
}

// Parse class index list: [{class_name, id}]
function parseClassIndices(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    const class_name = r.readStr();
    const id = r.readI32();
    list.push({ class_name, id });
  }
  return list;
}

// Parse net cache list (class_net_cache in rrrocket output):
// [{object_ind, parent_id, id, properties: [{object_ind, stream_id}]}]
function parseNetCache(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    const object_ind = r.readI32();
    const parent_id = r.readI32();
    const id = r.readI32();
    const propCount = r.readI32();
    const properties = [];
    for (let j = 0; j < propCount; j++) {
      const obj_ind = r.readI32();
      const stream_id = r.readI32();
      properties.push({ object_ind: obj_ind, stream_id });
    }
    list.push({ object_ind, parent_id, id, properties });
  }
  return list;
}

// Parse keyframes: [{time, frame, position}]
function parseKeyframes(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    const time = r.readF32();
    const frame = r.readI32();
    const position = r.readI32();
    list.push({ time, frame, position });
  }
  return list;
}

// Parse debug info list: [{frame, user, text}]
function parseDebugInfo(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    const frame = r.readI32();
    const user = r.readStr();
    const text = r.readStr();
    list.push({ frame, user, text });
  }
  return list;
}

// Parse tick marks: [{type, frame}]
function parseTickMarks(r) {
  const count = r.readI32();
  const list = [];
  for (let i = 0; i < count; i++) {
    const type = r.readStr();
    const frame = r.readI32();
    list.push({ type, frame });
  }
  return list;
}

/**
 * Parse a .replay file buffer.
 * Returns an object matching rrrocket's JSON output structure.
 * @param {Buffer} buf
 */
export function parseReplay(buf) {
  const r = new ByteReader(buf);

  // ---- Header section (byte-aligned) ----
  const header_size = r.readU32();
  const header_crc = r.readU32();
  const major_version = r.readI32();
  const minor_version = r.readI32();

  // net_version present from major_version >= 868
  let net_version = 0;
  if (major_version >= 868 && minor_version >= 18) {
    net_version = r.readI32();
  }

  const game_type = r.readStr();
  const properties = parseRdict(r);

  // ---- Body section ----
  const body_size = r.readU32();
  const body_crc = r.readU32();

  // levels
  const levels = parseStringList(r);

  // keyframes
  const keyframes = parseKeyframes(r);

  // network data (raw bytes)
  const network_data_size = r.readI32();
  const networkData = r.readBytes(network_data_size);

  // debug info
  const debug_info = parseDebugInfo(r);

  // tick marks
  const tick_marks = parseTickMarks(r);

  // packages
  const packages = parseStringList(r);

  // objects
  const objects = parseStringList(r);

  // names
  const names = parseStringList(r);

  // class indices
  const class_indices = parseClassIndices(r);

  // net cache
  const class_net_cache = parseNetCache(r);

  return {
    header_size,
    header_crc,
    major_version,
    minor_version,
    net_version,
    game_type,
    properties,
    body_size,
    body_crc,
    levels,
    keyframes,
    debug_info,
    tick_marks,
    packages,
    objects,
    names,
    class_indices,
    class_net_cache,
    // networkData is returned separately for the network parser
    _networkData: networkData,
  };
}
