"use strict";
const { Buffer } = require("buffer");

function assertBuffer(value, name) {
  if (!Buffer.isBuffer(value)) throw new TypeError(`${name}: expected a Buffer`);
}
function assertWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0) throw new RangeError("width must be a non-negative safe integer");
}
function assertBigInt(value) {
  if (typeof value !== "bigint" || value < 0n) throw new TypeError("num must be a non-negative bigint");
}
function assertFitsWidth(num, width) {
  if (width === 0) {
    if (num !== 0n) throw new RangeError("num does not fit in 0 bytes");
    return;
  }
  const maxExclusive = 1n << BigInt(width * 8);
  if (num >= maxExclusive) throw new RangeError(`num does not fit in ${width} bytes`);
}
function toBigIntLE(buf) {
  assertBuffer(buf, "toBigIntLE");
  if (buf.length === 0) return 0n;
  const reversed = Buffer.from(buf);
  reversed.reverse();
  return BigInt(`0x${reversed.toString("hex")}`);
}
function toBigIntBE(buf) {
  assertBuffer(buf, "toBigIntBE");
  if (buf.length === 0) return 0n;
  return BigInt(`0x${buf.toString("hex")}`);
}
function toBufferLE(num, width) {
  assertBigInt(num);
  assertWidth(width);
  assertFitsWidth(num, width);
  if (width === 0) return Buffer.alloc(0);
  const hex = num.toString(16).padStart(width * 2, "0");
  const out = Buffer.from(hex, "hex");
  out.reverse();
  return out;
}
function toBufferBE(num, width) {
  assertBigInt(num);
  assertWidth(width);
  assertFitsWidth(num, width);
  if (width === 0) return Buffer.alloc(0);
  const hex = num.toString(16).padStart(width * 2, "0");
  return Buffer.from(hex, "hex");
}
module.exports = { toBigIntLE, toBigIntBE, toBufferLE, toBufferBE };
