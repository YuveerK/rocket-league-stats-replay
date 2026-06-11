// Network frame decoder translated from boxcars/src/network/mod.rs and frame_decoder.rs.

import { ATTRIBUTES, PARENT_CLASSES, SPAWN_STATS } from "./data.js";
import { AttributeDecoder, ProductValueDecoder } from "./attributeDecoders.js";

// ---- Geometry (duplicated for trajectory decode; also used in attributeDecoders.js) ----

function bitWidth(x) {
  if (x === 0) return 0;
  return 32 - Math.clz32(x);
}

function vGte(v, maj, min, net) {
  if (v[0] !== maj) return v[0] > maj;
  if (v[1] !== min) return v[1] > min;
  return v[2] >= net;
}

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

function decodeRotation(bits) {
  const hasYaw = bits.readBit();
  const yaw = hasYaw ? bits.readI8() : null;
  const hasPitch = bits.readBit();
  const pitch = hasPitch ? bits.readI8() : null;
  const hasRoll = bits.readBit();
  const roll = hasRoll ? bits.readI8() : null;
  return { yaw, pitch, roll };
}

function decodeTrajectory(bits, spawn, netVersion) {
  if (spawn === "None") return { location: null, rotation: null };
  if (spawn === "Location") return { location: decodeVector3i(bits, netVersion), rotation: null };
  // LocationAndRotation
  return { location: decodeVector3i(bits, netVersion), rotation: decodeRotation(bits) };
}

// ---- Object normalization ----

const NORM_PREFIX = "TheWorld:PersistentLevel.";
const NORM_MAP = [
  ["CrowdActor_TA", "TheWorld:PersistentLevel.CrowdActor_TA"],
  ["CrowdManager_TA", "TheWorld:PersistentLevel.CrowdManager_TA"],
  ["VehiclePickup_Boost_TA", "TheWorld:PersistentLevel.VehiclePickup_Boost_TA"],
  ["InMapScoreboard_TA", "TheWorld:PersistentLevel.InMapScoreboard_TA"],
  ["BreakOutActor_Platform_TA", "TheWorld:PersistentLevel.BreakOutActor_Platform_TA"],
  ["PlayerStart_Platform_TA", "TheWorld:PersistentLevel.PlayerStart_Platform_TA"],
];
const MIN_NORM_LEN = "TheWorld:PersistentLevel.CrowdActor_TA".length;

function normalizeObject(name) {
  if (name.length <= MIN_NORM_LEN) return name;
  let rest;
  if (name.startsWith(NORM_PREFIX)) {
    rest = name.slice(NORM_PREFIX.length);
  } else {
    const dot = name.indexOf(".");
    if (dot !== -1) {
      const suffix = name.slice(dot + 1);
      if (suffix.startsWith(NORM_PREFIX)) rest = suffix.slice(NORM_PREFIX.length);
      else return name;
    } else {
      return name;
    }
  }
  for (const [pfx, norm] of NORM_MAP) {
    if (rest.startsWith(pfx)) return norm;
  }
  return name;
}

// ---- Object index (name → first object index) ----

function buildObjectIndex(objects) {
  const map = new Map();
  for (let i = 0; i < objects.length; i++) {
    if (!map.has(objects[i])) map.set(objects[i], i);
  }
  return map;
}

// Walk inheritance hierarchy, yielding object indices present in the index.
function* hierarchyIds(name, nameIndex) {
  let current = name;
  while (true) {
    const parent = PARENT_CLASSES.get(normalizeObject(current));
    if (parent === undefined) break;
    const id = nameIndex.get(current);
    if (id !== undefined) yield id;
    current = parent;
  }
}

// ---- Spawn trajectory array ----

function buildSpawns(objects, nameIndex) {
  const spawns = new Array(objects.length).fill(null);

  for (const [name, spawnType] of SPAWN_STATS) {
    const id = nameIndex.get(name);
    if (id !== undefined) spawns[id] = spawnType;
  }

  const parentStack = [];
  for (const name of objects) {
    let result = "None";
    for (const objId of hierarchyIds(name, nameIndex)) {
      if (spawns[objId] !== null) {
        result = spawns[objId];
        break;
      }
      parentStack.push(objId);
    }
    for (const ind of parentStack) spawns[ind] = result;
    parentStack.length = 0;
  }

  return spawns.map(s => s ?? "None");
}

// ---- Net cache: objectInd → [{streamId, tag, objectId, objectName}] ----

function buildNetProperties(netCache, objects) {
  const netProps = new Map(); // objectInd → Array
  for (const cache of netCache) {
    const key = cache.object_ind;
    if (!netProps.has(key)) netProps.set(key, []);
    const props = netProps.get(key);
    for (const x of cache.properties) {
      const objName = objects[x.object_ind];
      const tag = objName !== undefined ? (ATTRIBUTES.get(objName) ?? null) : null;
      props.push({ streamId: x.stream_id, tag, objectId: x.object_ind, objectName: objName });
    }
  }
  return netProps;
}

// net_traversal: accumulate inherited + own attributes for each object.
// objectIndAttrs: Map<objectInd, Map<streamId, {tag, objectId, objectName}>>
function netTraversal(objectName, accAttrs, parentStack, netProps, nameIndex, objectIndAttrs) {
  accAttrs.length = 0;
  for (const objId of hierarchyIds(objectName, nameIndex)) {
    const cached = objectIndAttrs.get(objId);
    if (cached !== undefined) {
      for (const [sid, attr] of cached) accAttrs.push([sid, attr]);
      break;
    }
    parentStack.push(objId);
  }

  for (let i = parentStack.length - 1; i >= 0; i--) {
    const ind = parentStack[i];
    const props = netProps.get(ind);
    if (props) {
      for (const p of props) accAttrs.push([p.streamId, p]);
    }
    const snapshot = new Map(accAttrs);
    objectIndAttrs.set(ind, snapshot);
  }
  parentStack.length = 0;
}

// Build final cache info array indexed by objectId.
function buildCacheInfoArray(objectIndAttrs, objectCount) {
  const result = new Array(objectCount).fill(null);
  for (const [objId, attrsMap] of objectIndAttrs) {
    if (objId >= objectCount) continue;
    const streamIds = [...attrsMap.keys()];
    const max = streamIds.length === 0 ? 2 : Math.max(...streamIds) + 1;
    const maxBitWidth = bitWidth(max);
    const propIdBits = Math.max(maxBitWidth, 1) - 1;
    result[objId] = { maxPropId: max, propIdBits, attrs: attrsMap };
  }
  return result;
}

// ---- Frame decoder ----

function decodeFrames(bits, framesLen, version, maxChannels, channelBits, spawns, cacheInfos, attrDecoder, isLan) {
  const netVersion = version[2];
  const doParseNameId = vGte(version, 868, 20, 0) || (vGte(version, 868, 14, 0) && !isLan);
  const frames = [];
  const actors = new Map(); // actorId → {objectId, cacheInfo}

  while (!bits.isEmpty() && frames.length < framesLen) {
    const time = bits.readF32();
    const delta = bits.readF32();
    if (time === 0.0 && delta === 0.0) break;
    if (time < 0.0 || delta < 0.0) break;

    const newActors = [];
    const deletedActors = [];
    const updatedActors = [];

    while (bits.readBit()) {
      const actorId = bits.peekBitsMaxComputed(channelBits, maxChannels);
      const alive = bits.readBit();

      if (alive) {
        const isNew = bits.readBit();
        if (isNew) {
          let nameId = null;
          if (doParseNameId) nameId = bits.readI32();
          bits.readBit(); // unused flag
          const objectId = bits.readI32();
          const spawn = spawns[objectId] ?? "None";
          const traj = decodeTrajectory(bits, spawn, netVersion);
          const cacheInfo = cacheInfos[objectId];
          if (!cacheInfo) throw new Error(`Missing cache for objectId ${objectId} actor ${actorId}`);
          actors.set(actorId, { objectId, cacheInfo });
          newActors.push({ actor_id: actorId, name_id: nameId, object_id: objectId, initial_trajectory: traj });
        } else {
          const actorInfo = actors.get(actorId);
          if (!actorInfo) throw new Error(`Missing actor ${actorId}`);
          const { objectId, cacheInfo } = actorInfo;
          while (bits.readBit()) {
            const streamId = bits.peekBitsMaxComputed(cacheInfo.propIdBits, cacheInfo.maxPropId);
            const attrInfo = cacheInfo.attrs.get(streamId);
            if (!attrInfo) throw new Error(`Missing stream ${streamId} for actor ${actorId}`);
            if (attrInfo.tag === null) {
              throw new Error(`Unknown attribute: ${attrInfo.objectName} (stream ${streamId})`);
            }
            const attribute = attrDecoder.decode(attrInfo.tag, bits);
            updatedActors.push({ actor_id: actorId, stream_id: streamId, object_id: attrInfo.objectId, attribute });
          }
        }
      } else {
        deletedActors.push(actorId);
        actors.delete(actorId);
      }
    }

    frames.push({ time, delta, new_actors: newActors, deleted_actors: deletedActors, updated_actors: updatedActors });
  }

  return frames;
}

// ---- Main entry ----

/**
 * Parse network frames from the body section of a replay.
 * @param {object} replay - output of parseReplay() from headerParser.js
 * @param {import('./BitReader.js').BitReader} bits - positioned at start of network data
 * @returns {{ frames: Array }}
 */
export function parseNetworkFrames(replay, bits) {
  const { major_version, minor_version, net_version, objects, class_net_cache, properties } = replay;
  const version = [major_version, minor_version, net_version];

  const nameIndex = buildObjectIndex(objects);
  const spawns = buildSpawns(objects, nameIndex);
  const netProps = buildNetProperties(class_net_cache, objects);

  const objectIndAttrs = new Map();
  const accAttrs = [];
  const parentStack = [];
  for (const name of objects) {
    netTraversal(name, accAttrs, parentStack, netProps, nameIndex, objectIndAttrs);
  }

  const cacheInfos = buildCacheInfoArray(objectIndAttrs, objects.length);

  // Product value decoder (for loadout online attrs)
  const productDecoder = new ProductValueDecoder(version, nameIndex);

  const maxChannels = (properties?.MaxChannels ?? 1023) >>> 0;
  const channelBitWidth = bitWidth(maxChannels);
  const channelBits = Math.max(channelBitWidth, 1) - 1;

  const buildVersion = properties?.BuildVersion ?? "";
  const isRl223 = buildVersion >= "221120.42953.406184";
  const matchType = properties?.MatchType ?? "";
  const isLan = matchType === "Lan";

  const numFrames = properties?.NumFrames ?? 0;
  if (numFrames === 0) return { frames: [] };

  const attrDecoder = new AttributeDecoder(version, productDecoder, isRl223);
  const frames = decodeFrames(bits, numFrames, version, maxChannels, channelBits, spawns, cacheInfos, attrDecoder, isLan);

  return { frames };
}
