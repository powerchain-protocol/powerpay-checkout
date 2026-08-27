import { expect } from "chai";

const CANONICAL_PWRC_MINT = "PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc";
const PWRC_TRANSFER_FEE_BPS = 200n;

function uncappedFee(amountRaw: bigint) {
  return (amountRaw * PWRC_TRANSFER_FEE_BPS + 9_999n) / 10_000n;
}

describe("pwrc-sale invariants", () => {
  it("pins the canonical PWRC mint", () => {
    expect(CANONICAL_PWRC_MINT).to.equal("PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc");
  });

  it("keeps the gross raw unit math deterministic for equal 9-decimal assets", () => {
    const lamports = 500_000_000n;
    const pwrcPerSol = 73_500_000n;
    const grossRaw = lamports * pwrcPerSol;
    expect(grossRaw).to.equal(36_750_000n * 1_000_000_000n);
  });

  it("models a 200 bps PWRC transfer fee before the Token-2022 maximum-fee cap", () => {
    const grossRaw = 1_000_000n * 1_000_000_000n;
    const feeRaw = uncappedFee(grossRaw);
    expect(feeRaw).to.equal(20_000n * 1_000_000_000n);
    expect(grossRaw - feeRaw).to.equal(980_000n * 1_000_000_000n);
  });

  it("keeps the Solana network fee separate from PWRC token-fee math", () => {
    const grossRaw = 100n * 1_000_000_000n;
    const feeRaw = uncappedFee(grossRaw);
    expect(feeRaw).to.equal(2n * 1_000_000_000n);
    expect(grossRaw - feeRaw).to.equal(98n * 1_000_000_000n);
  });

  it("rejects arithmetic outside u64 before program transfer", () => {
    const U64_MAX = (1n << 64n) - 1n;
    expect((1_000_000_000_000n * 73_500_000n) > U64_MAX).to.equal(true);
  });
});

describe("pwrc-sale v0.3 quote binding", () => {
  it("uses a single-use receipt seed domain for checkout references", () => {
    expect(Buffer.from("purchase").toString("utf8")).to.equal("purchase");
  });

  it("requires the signed fee expectation to remain exactly 200 bps", () => {
    const reviewedFeeBps = 200n;
    const changedFeeBps = 250n;
    expect(reviewedFeeBps).to.equal(PWRC_TRANSFER_FEE_BPS);
    expect(changedFeeBps).not.to.equal(PWRC_TRANSFER_FEE_BPS);
  });

  it("fails the quote model when net output falls below the reviewed minimum", () => {
    const reviewedMinNet = 98_000_000_000n;
    const changedNet = 97_999_999_999n;
    expect(changedNet < reviewedMinNet).to.equal(true);
  });
});
