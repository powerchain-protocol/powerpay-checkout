import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Buffer } from "buffer";
import { toBigIntBE, toBigIntLE, toBufferBE, toBufferLE } from "../packages/bigint-buffer/index.js";

describe("bigint-buffer compatibility boundary", () => {
  it("round-trips big-endian values", () => {
    const value = 0x0102030405060708n;
    assert.equal(toBigIntBE(toBufferBE(value, 8)), value);
  });

  it("round-trips little-endian values", () => {
    const value = 0x0102030405060708n;
    assert.equal(toBigIntLE(toBufferLE(value, 8)), value);
  });

  it("does not mutate input buffers", () => {
    const input = Buffer.from([0x01, 0x02, 0x03]);
    const before = Buffer.from(input);
    assert.equal(toBigIntLE(input), 0x030201n);
    assert.deepEqual(input, before);
  });

  it("rejects non-buffer inputs", () => {
    assert.throws(() => toBigIntLE(new Uint8Array([1, 2, 3])), TypeError);
  });

  it("rejects negative values and invalid widths", () => {
    assert.throws(() => toBufferBE(-1n, 8), TypeError);
    assert.throws(() => toBufferBE(1n, -1), RangeError);
    assert.throws(() => toBufferBE(1n, 1.5), RangeError);
  });

  it("rejects values that exceed the requested output width", () => {
    assert.throws(() => toBufferBE(256n, 1), RangeError);
    assert.throws(() => toBufferLE(256n, 1), RangeError);
  });

  it("allows only zero in a zero-width buffer", () => {
    assert.equal(toBufferBE(0n, 0).length, 0);
    assert.throws(() => toBufferBE(1n, 0), RangeError);
  });
});
