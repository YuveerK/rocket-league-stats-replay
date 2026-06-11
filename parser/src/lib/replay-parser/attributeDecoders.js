// Attribute decoders translated from boxcars/src/network/attributes.rs.
// Each decoder returns a serde-compatible JS object: {VariantName: value}.

import { BitReader } from "./BitReader.js";

// Compare version triplets [major, minor, net] lexicographically.
function vGte(v, maj, min, net) {
  if (v[0] !== maj) return v[0] > maj;
  if (v[1] !== min) return v[1] > min;
  return v[2] >= net;
}

// ---- Geometry helpers ----

function decodeVector3i(bits, netVersion) {
  const maxVal = netVersion >= 7 ? 22 : 20;
  const sizeBits = bits.peekBitsMaxComputed(4, maxVal);
  const bias = 1 << (sizeBits + 1);
  const bitLimit = sizeBits + 2;
  const dx = bits.readBits(bitLimit) >>> 0;
  const dy = bits.readBits(bitLimit) >>> 0;
  const dz = bits.readBits(bitLimit) >>> 0;
  return { x: dx - bias, y: dy - bias, z: dz - bias };
}

function decodeVector3f(bits, netVersion) {
  const v = decodeVector3i(bits, netVersion);
  return { x: v.x / 100.0, y: v.y / 100.0, z: v.z / 100.0 };
}

function quaternionUnpack(val) {
  const maxValue = (1 << 18) - 1;
  const posRange = val / maxValue;
  const range = (posRange - 0.5) * 2.0;
  return range * (1.0 / Math.SQRT2);
}

function decodeQuaternion(bits) {
  // Standard: 2-bit largest index + 3×18-bit components
  const largest = bits.readBits(2);
  const a = quaternionUnpack(bits.readBits(18));
  const b = quaternionUnpack(bits.readBits(18));
  const c = quaternionUnpack(bits.readBits(18));
  const extra = Math.sqrt(Math.max(0, 1.0 - a * a - b * b - c * c));
  switch (largest) {
    case 0: return { x: extra, y: a, z: b, w: c };
    case 1: return { x: a, y: extra, z: b, w: c };
    case 2: return { x: a, y: b, z: extra, w: c };
    default: return { x: a, y: b, z: c, w: extra };
  }
}

function compressedF32(bits) {
  const res = bits.readBits(16);
  // same as: ((res + i16::MIN) as f32) / i16::MAX
  return (res - 32768) / 32767.0;
}

function decodeQuaternionCompressed(bits) {
  const x = compressedF32(bits);
  const y = compressedF32(bits);
  const z = compressedF32(bits);
  return { x, y, z, w: 0.0 };
}

function decodeRotation(bits) {
  const hasYaw = bits.readBit();
  const yaw = hasYaw ? bits.readI8() : null;
  const hasPitch = bits.readBit();
  const pitch = hasPitch ? bits.readI8() : null;
  const hasRoll = bits.readBit();
  const roll = hasRoll ? bits.readI8() : null;
  return { yaw, pitch, roll };
}

// ---- Text decoder (network frames use bit-level read) ----

function decodeText(bits) {
  const size = bits.readI32();
  if (size === 0) return "";
  if (size < 0) {
    const byteCount = (-size) * 2;
    const bytes = bits.readBytes(byteCount);
    // UTF-16LE, strip null terminator (last 2 bytes)
    return bytes.slice(0, byteCount - 2).toString("utf16le");
  }
  // Windows-1252 / Latin-1
  const bytes = bits.readBytes(size);
  return bytes.slice(0, size - 1).toString("latin1");
}

// ---- Active actor ----

function decodeActiveActor(bits) {
  const active = bits.readBit() !== 0;
  const actor = bits.readI32();
  return { active, actor };
}

// ---- UniqueId / RemoteId ----

function decodeUniqueId(bits, netVersion) {
  const systemId = bits.readU8();
  return decodeUniqueIdWithSystemId(bits, netVersion, systemId);
}

function decodeUniqueIdWithSystemId(bits, netVersion, systemId) {
  let remoteId;
  switch (systemId) {
    case 0: {
      const v = bits.readBits(24);
      remoteId = { SplitScreen: v };
      break;
    }
    case 1: {
      const v = bits.readU64();
      remoteId = { Steam: String(v) };
      break;
    }
    case 2: {
      // PS4: 16 bytes name + unknown bytes + u64 online_id
      const nameBytes = bits.readBytes(16);
      const nameEnd = nameBytes.indexOf(0);
      const name = (nameEnd === -1 ? nameBytes : nameBytes.slice(0, nameEnd)).toString("latin1");
      const toRead = netVersion >= 1 ? 16 : 8;
      const unknown1 = Array.from(bits.readBytes(toRead));
      const onlineId = bits.readU64();
      remoteId = { PlayStation: { online_id: String(onlineId), name, unknown1 } };
      break;
    }
    case 4: {
      const v = bits.readU64();
      remoteId = { Xbox: String(v) };
      break;
    }
    case 5: {
      const v = bits.readU64();
      remoteId = { QQ: String(v) };
      break;
    }
    case 6: {
      const onlineId = bits.readU64();
      const unknown1 = Array.from(bits.readBytes(24));
      remoteId = { Switch: { online_id: String(onlineId), unknown1 } };
      break;
    }
    case 7: {
      const onlineId = bits.readU64();
      if (netVersion < 10) {
        const unknown1 = Array.from(bits.readBytes(24));
        remoteId = { PsyNet: { online_id: String(onlineId), unknown1 } };
      } else {
        remoteId = { PsyNet: { online_id: String(onlineId), unknown1: [] } };
      }
      break;
    }
    case 11: {
      const text = decodeText(bits);
      remoteId = { Epic: text };
      break;
    }
    default:
      throw new Error(`Unrecognized remote id system: ${systemId}`);
  }

  const localId = bits.readU8();
  return { system_id: systemId, remote_id: remoteId, local_id: localId };
}

// ---- Loadout ----

function decodeLoadout(bits) {
  const version = bits.readU8();
  const body = bits.readU32();
  const decal = bits.readU32();
  const wheels = bits.readU32();
  const rocket_trail = bits.readU32();
  const antenna = bits.readU32();
  const topper = bits.readU32();
  const unknown1 = bits.readU32();
  const unknown2 = version > 10 ? bits.readU32() : null;
  let engine_audio = null, trail = null, goal_explosion = null;
  if (version >= 16) {
    engine_audio = bits.readU32();
    trail = bits.readU32();
    goal_explosion = bits.readU32();
  }
  const banner = version >= 17 ? bits.readU32() : null;
  const product_id = version >= 19 ? bits.readU32() : null;
  if (version >= 22) {
    bits.readU32(); bits.readU32(); bits.readU32();
  }
  return { version, body, decal, wheels, rocket_trail, antenna, topper, unknown1, unknown2, engine_audio, trail, goal_explosion, banner, product_id };
}

// ---- ProductValue decoder ----

export class ProductValueDecoder {
  constructor(version, objectIndex) {
    this.version = version;
    this.colorInd = objectIndex.get("TAGame.ProductAttribute_UserColor_TA") ?? 0;
    this.paintedInd = objectIndex.get("TAGame.ProductAttribute_Painted_TA") ?? 0;
    this.titleInd = objectIndex.get("TAGame.ProductAttribute_TitleID_TA") ?? 0;
    this.specialEditionInd = objectIndex.get("TAGame.ProductAttribute_SpecialEdition_TA") ?? 0;
    this.teamEditionInd = objectIndex.get("TAGame.ProductAttribute_TeamEdition_TA") ?? 0;
  }

  decode(bits, objInd) {
    const v = this.version;
    if (objInd === this.colorInd) {
      if (vGte(v, 868, 23, 8)) {
        return { NewColor: bits.readU32() };
      }
      const hasColor = bits.readBit();
      if (!hasColor) return "NoColor";
      return { OldColor: bits.readBits(31) };
    } else if (objInd === this.paintedInd) {
      if (vGte(v, 868, 18, 0)) {
        return { NewPaint: bits.readBits(31) };
      }
      return { OldPaint: bits.peekBitsMaxComputed(3, 14) };
    } else if (objInd === this.titleInd) {
      return { Title: decodeText(bits) };
    } else if (objInd === this.specialEditionInd) {
      return { SpecialEdition: bits.readBits(31) };
    } else if (objInd === this.teamEditionInd) {
      if (vGte(v, 868, 18, 0)) {
        return { NewTeamEdition: bits.readBits(31) };
      }
      return { OldTeamEdition: bits.peekBitsMaxComputed(3, 14) };
    }
    return "Absent";
  }
}

// ---- Main attribute decoder ----

export class AttributeDecoder {
  constructor(version, productDecoder, isRl223) {
    this.version = version;        // [major, minor, net]
    this.netVersion = version[2];
    this.productDecoder = productDecoder;
    this.isRl223 = isRl223;
  }

  decode(tag, bits) {
    switch (tag) {
      case "Boolean":       return { Boolean: bits.readBit() !== 0 };
      case "Byte":          return { Byte: bits.readU8() };
      case "Int":           return { Int: bits.readI32() };
      case "Float":         return { Float: bits.readF32() };
      case "Enum":          return { Enum: bits.readBits(11) };
      case "PlayerHistoryKey": return { PlayerHistoryKey: bits.readBits(14) };
      case "Int64":         return { Int64: String(bits.readI64()) };
      case "QWordString":   return this.isRl223
                              ? { String: decodeText(bits) }
                              : { QWord: String(bits.readU64()) };
      case "String":        return { String: decodeText(bits) };
      case "RotationTag":   return { Rotation: decodeRotation(bits) };
      case "ActiveActor":   return { ActiveActor: decodeActiveActor(bits) };
      case "FlaggedByte": {
        const flag = bits.readBit() !== 0;
        const b = bits.readU8();
        return { FlaggedByte: [flag, b] };
      }
      case "GameMode": {
        const bitCount = vGte(this.version, 868, 12, 0) ? 8 : 2;
        const val = bits.readBits(bitCount);
        return { GameMode: [bitCount, val] };
      }
      case "Location":
        return { Location: decodeVector3f(bits, this.netVersion) };
      case "RigidBody":
        return { RigidBody: this._decodeRigidBody(bits) };
      case "UniqueId":
        return { UniqueId: decodeUniqueId(bits, this.netVersion) };
      case "ActiveActor":
        return { ActiveActor: decodeActiveActor(bits) };
      case "CamSettings":
        return { CamSettings: this._decodeCamSettings(bits) };
      case "ClubColors":
        return { ClubColors: this._decodeClubColors(bits) };
      case "Demolish":
        return { Demolish: this._decodeDemolish(bits) };
      case "DemolishFx":
        return { DemolishFx: this._decodeDemolishFx(bits) };
      case "DemolishExtended":
        return { DemolishExtended: this._decodeDemolishExtended(bits) };
      case "Explosion":
        return { Explosion: this._decodeExplosion(bits) };
      case "ExtendedExplosion": {
        const explosion = this._decodeExplosion(bits);
        const unknown1 = bits.readBit() !== 0;
        const secondaryActor = bits.readI32();
        return { ExtendedExplosion: { explosion, unknown1, secondary_actor: secondaryActor } };
      }
      case "AppliedDamage": {
        const id = bits.readU8();
        const position = decodeVector3f(bits, this.netVersion);
        const damage_index = bits.readI32();
        const total_damage = bits.readI32();
        return { AppliedDamage: { id, position, damage_index, total_damage } };
      }
      case "DamageState": {
        const tile_state = bits.readU8();
        const damaged = bits.readBit() !== 0;
        const offender = bits.readI32();
        const ball_position = decodeVector3f(bits, this.netVersion);
        const direct_hit = bits.readBit() !== 0;
        const unknown1 = bits.readBit() !== 0;
        return { DamageState: { tile_state, damaged, offender, ball_position, direct_hit, unknown1 } };
      }
      case "MusicStinger": {
        const flag = bits.readBit() !== 0;
        const cue = bits.readU32();
        const trigger = bits.readU8();
        return { MusicStinger: { flag, cue, trigger } };
      }
      case "StatEvent": {
        const unknown1 = bits.readBit() !== 0;
        const object_id = bits.readI32();
        return { StatEvent: { unknown1, object_id } };
      }
      case "Pickup": {
        const instigator = bits.readBit() ? bits.readI32() : null;
        const picked_up = bits.readBit() !== 0;
        return { Pickup: { instigator, picked_up } };
      }
      case "PickupNew": {
        const instigator = bits.readBit() ? bits.readI32() : null;
        const picked_up = bits.readU8();
        return { PickupNew: { instigator, picked_up } };
      }
      case "TeamPaint": {
        const team = bits.readU8();
        const primary_color = bits.readU8();
        const accent_color = bits.readU8();
        const primary_finish = bits.readU32();
        const accent_finish = bits.readU32();
        return { TeamPaint: { team, primary_color, accent_color, primary_finish, accent_finish } };
      }
      case "Welded": {
        const active = bits.readBit() !== 0;
        const actor = bits.readI32();
        const offset = decodeVector3f(bits, this.netVersion);
        const mass = bits.readF32();
        const rotation = decodeRotation(bits);
        return { Welded: { active, actor, offset, mass, rotation } };
      }
      case "Title": {
        const u1 = bits.readBit() !== 0;
        const u2 = bits.readBit() !== 0;
        const u3 = bits.readU32();
        const u4 = bits.readU32();
        const u5 = bits.readU32();
        const u6 = bits.readU32();
        const u7 = bits.readU32();
        const u8 = bits.readBit() !== 0;
        return { Title: [u1, u2, u3, u4, u5, u6, u7, u8] };
      }
      case "Loadout":
        return { Loadout: decodeLoadout(bits) };
      case "TeamLoadout": {
        const blue = decodeLoadout(bits);
        const orange = decodeLoadout(bits);
        return { TeamLoadout: { blue, orange } };
      }
      case "LoadoutOnline":
        return { LoadoutOnline: this._decodeOnlineLoadout(bits) };
      case "LoadoutsOnline": {
        const blue = this._decodeOnlineLoadout(bits);
        const orange = this._decodeOnlineLoadout(bits);
        const unknown1 = bits.readBit() !== 0;
        const unknown2 = bits.readBit() !== 0;
        return { LoadoutsOnline: { blue, orange, unknown1, unknown2 } };
      }
      case "Reservation":
        return { Reservation: this._decodeReservation(bits) };
      case "PartyLeader": {
        const systemId = bits.readU8();
        if (systemId !== 0) {
          const uid = decodeUniqueIdWithSystemId(bits, this.netVersion, systemId);
          return { PartyLeader: uid };
        }
        return { PartyLeader: null };
      }
      case "PrivateMatchSettings": {
        const mutators = decodeText(bits);
        const joinable_by = bits.readU32();
        const max_players = bits.readU32();
        const game_name = decodeText(bits);
        const password = decodeText(bits);
        const flag = bits.readBit() !== 0;
        return { PrivateMatch: { mutators, joinable_by, max_players, game_name, password, flag } };
      }
      case "RepStatTitle": {
        const unknown = bits.readBit() !== 0;
        const name = decodeText(bits);
        const unknown2 = bits.readBit() !== 0;
        const index = bits.readU32();
        const value = bits.readU32();
        return { RepStatTitle: { unknown, name, unknown2, index, value } };
      }
      case "PickupInfo": {
        const p1 = decodeActiveActor(bits);
        const p2 = decodeActiveActor(bits);
        const p3 = decodeActiveActor(bits);
        const items_are_preview = bits.readBit() !== 0;
        return { PickupInfo: { available_pickups: [p1, p2, p3], items_are_preview } };
      }
      case "Impulse": {
        const compressed_rotation = bits.readI32();
        const speed = bits.readF32();
        return { Impulse: { compressed_rotation, speed } };
      }
      case "ReplicatedBoost": {
        const grant_count = bits.readU8();
        const boost_amount = bits.readU8();
        const unused1 = bits.readU8();
        const unused2 = bits.readU8();
        return { ReplicatedBoost: { grant_count, boost_amount, unused1, unused2 } };
      }
      case "LogoData": {
        const logo_id = bits.readU32();
        const swap_colors = bits.readBit() !== 0;
        return { LogoData: { logo_id, swap_colors } };
      }
      default:
        throw new Error(`Unknown attribute tag: ${tag}`);
    }
  }

  _decodeRigidBody(bits) {
    const sleeping = bits.readBit() !== 0;
    const location = decodeVector3f(bits, this.netVersion);
    const rotation = this.netVersion >= 7
      ? decodeQuaternion(bits)
      : decodeQuaternionCompressed(bits);
    let linear_velocity = null;
    let angular_velocity = null;
    if (!sleeping) {
      linear_velocity = decodeVector3f(bits, this.netVersion);
      angular_velocity = decodeVector3f(bits, this.netVersion);
    }
    return { sleeping, location, rotation, linear_velocity, angular_velocity };
  }

  _decodeCamSettings(bits) {
    const fov = bits.readF32();
    const height = bits.readF32();
    const angle = bits.readF32();
    const distance = bits.readF32();
    const stiffness = bits.readF32();
    const swivel = bits.readF32();
    const transition = vGte(this.version, 868, 20, 0) ? bits.readF32() : null;
    return { fov, height, angle, distance, stiffness, swivel, transition };
  }

  _decodeClubColors(bits) {
    const blue_flag = bits.readBit() !== 0;
    const blue_color = bits.readU8();
    const orange_flag = bits.readBit() !== 0;
    const orange_color = bits.readU8();
    return { blue_flag, blue_color, orange_flag, orange_color };
  }

  _decodeDemolish(bits) {
    const attacker_flag = bits.readBit() !== 0;
    const attacker = bits.readI32();
    const victim_flag = bits.readBit() !== 0;
    const victim = bits.readI32();
    const attack_velocity = decodeVector3f(bits, this.netVersion);
    const victim_velocity = decodeVector3f(bits, this.netVersion);
    return { attacker_flag, attacker, victim_flag, victim, attack_velocity, victim_velocity };
  }

  _decodeDemolishFx(bits) {
    const custom_demo_flag = bits.readBit() !== 0;
    const custom_demo_id = bits.readI32();
    const attacker_flag = bits.readBit() !== 0;
    const attacker = bits.readI32();
    const victim_flag = bits.readBit() !== 0;
    const victim = bits.readI32();
    const attack_velocity = decodeVector3f(bits, this.netVersion);
    const victim_velocity = decodeVector3f(bits, this.netVersion);
    return { custom_demo_flag, custom_demo_id, attacker_flag, attacker, victim_flag, victim, attack_velocity, victim_velocity };
  }

  _decodeDemolishExtended(bits) {
    const attacker_pri = decodeActiveActor(bits);
    const self_demo = decodeActiveActor(bits);
    const self_demolish = bits.readBit() !== 0;
    const goal_explosion_owner = decodeActiveActor(bits);
    const attacker = decodeActiveActor(bits);
    const victim = decodeActiveActor(bits);
    const attacker_velocity = decodeVector3f(bits, this.netVersion);
    const victim_velocity = decodeVector3f(bits, this.netVersion);
    return { attacker_pri, self_demo, self_demolish, goal_explosion_owner, attacker, victim, attacker_velocity, victim_velocity };
  }

  _decodeExplosion(bits) {
    const flag = bits.readBit() !== 0;
    const actor = bits.readI32();
    const location = decodeVector3f(bits, this.netVersion);
    return { flag, actor, location };
  }

  _decodeReservation(bits) {
    const number = bits.readBits(3);
    const unique_id = decodeUniqueId(bits, this.netVersion);
    let name = null;
    const isSplitScreenZero =
      unique_id.system_id === 0 &&
      typeof unique_id.remote_id.SplitScreen !== "undefined" &&
      unique_id.remote_id.SplitScreen === 0;
    if (unique_id.system_id !== 0) {
      name = decodeText(bits);
    } else if (!isSplitScreenZero) {
      // Read null-terminated string up to 255 chars
      let result = "";
      while (result.length < 255) {
        const c = bits.readU8();
        if (c === 0) break;
        result += String.fromCharCode(c);
      }
      name = result || null;
    }
    const unknown1 = bits.readBit() !== 0;
    const unknown2 = bits.readBit() !== 0;
    let unknown3 = null;
    if (vGte(this.version, 868, 12, 0)) {
      unknown3 = bits.readBits(6);
    }
    return { number, unique_id, name, unknown1, unknown2, unknown3 };
  }

  _decodeOnlineLoadout(bits) {
    const size = bits.readU8();
    const result = [];
    for (let i = 0; i < size; i++) {
      const attrSize = bits.readU8();
      const products = [];
      for (let j = 0; j < attrSize; j++) {
        const unknown = bits.readBit() !== 0;
        const objInd = bits.readI32();
        const value = this.productDecoder.decode(bits, objInd);
        products.push({ unknown, object_ind: objInd, value });
      }
      result.push(products);
    }
    return result;
  }
}
