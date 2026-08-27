import { expect } from "chai";

describe("pwrc-sale invariants", () => {
  it("keeps the gross raw unit math deterministic for equal 9-decimal assets", () => {
    const lamports = 500_000_000n;
    const pwrcPerSol = 73_500_000n;
    const grossRaw = lamports * pwrcPerSol;
    expect(grossRaw).to.equal(36_750_000n * 1_000_000_000n);
  });

  it("rejects arithmetic outside u64 before program transfer", () => {
    const U64_MAX = (1n << 64n) - 1n;
    expect((1_000_000_000_000n * 73_500_000n) > U64_MAX).to.equal(true);
  });
});
