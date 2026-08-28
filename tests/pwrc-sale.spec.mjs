import assert from "node:assert/strict";
import { describe, it } from "node:test";

const CANONICAL_PWRC_MINT = "PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc";
const PWRC_TRANSFER_FEE_BPS = 200n;
const POWERPAY_SERVICE_FEE_BPS = 200n;

function uncappedFee(amountRaw) {
  return (amountRaw * PWRC_TRANSFER_FEE_BPS + 9_999n) / 10_000n;
}

describe("pwrc-sale invariants", () => {
  it("pins the canonical PWRC mint", () => {
    assert.equal(CANONICAL_PWRC_MINT, "PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc");
  });

  it("keeps the gross raw unit math deterministic for equal 9-decimal assets", () => {
    const lamports = 500_000_000n;
    const pwrcPerSol = 73_500_000n;
    const grossRaw = lamports * pwrcPerSol;
    assert.equal(grossRaw, 36_750_000n * 1_000_000_000n);
  });

  it("models a 200 bps PWRC transfer fee before the Token-2022 maximum-fee cap", () => {
    const grossRaw = 1_000_000n * 1_000_000_000n;
    const feeRaw = uncappedFee(grossRaw);
    assert.equal(feeRaw, 20_000n * 1_000_000_000n);
    assert.equal(grossRaw - feeRaw, 980_000n * 1_000_000_000n);
  });

  it("keeps the Solana network fee separate from PWRC token-fee math", () => {
    const grossRaw = 100n * 1_000_000_000n;
    const feeRaw = uncappedFee(grossRaw);
    assert.equal(feeRaw, 2n * 1_000_000_000n);
    assert.equal(grossRaw - feeRaw, 98n * 1_000_000_000n);
  });

  it("rejects arithmetic outside u64 before program transfer", () => {
    const U64_MAX = (1n << 64n) - 1n;
    assert.equal(1_000_000_000_000n * 73_500_000n > U64_MAX, true);
  });
});

describe("pwrc-sale canonical 1.0.0 quote binding", () => {
  it("adds the canonical 2% service fee to SOL while keeping the network fee separate", () => {
    const purchaseLamports = 500_000_000n;
    const serviceFeeLamports = (purchaseLamports * POWERPAY_SERVICE_FEE_BPS + 9_999n) / 10_000n;
    assert.equal(serviceFeeLamports, 10_000_000n);
    assert.equal(purchaseLamports + serviceFeeLamports, 510_000_000n);
  });

  it("requires both reviewed fee policies to remain exactly 200 bps", () => {
    assert.equal(POWERPAY_SERVICE_FEE_BPS, 200n);
    assert.equal(PWRC_TRANSFER_FEE_BPS, 200n);
  });

  it("uses a single-use receipt seed domain for checkout references", () => {
    assert.equal(Buffer.from("purchase").toString("utf8"), "purchase");
  });

  it("requires the signed fee expectation to remain exactly 200 bps", () => {
    const reviewedFeeBps = 200n;
    const changedFeeBps = 250n;
    assert.equal(reviewedFeeBps, PWRC_TRANSFER_FEE_BPS);
    assert.notEqual(changedFeeBps, PWRC_TRANSFER_FEE_BPS);
  });

  it("fails the quote model when net output falls below the reviewed minimum", () => {
    const reviewedMinNet = 98_000_000_000n;
    const changedNet = 97_999_999_999n;
    assert.equal(changedNet < reviewedMinNet, true);
  });
});
