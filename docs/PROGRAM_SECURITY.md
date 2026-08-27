# PowerPay program security invariants

## Canonical asset

PowerPay's sale program accepts only the canonical Solana Token-2022 PWRC mint:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The mint must use 9 decimals and expose an active Token-2022 `TransferFeeConfig` whose active epoch basis-point value is exactly **200 bps / 2%**.

## Fee model

A successful Buy PWRC transaction has two protocol-level costs:

1. **PWRC transfer fee — 2%**. This is enforced by the canonical PWRC Token-2022 mint. The program reads the active epoch fee and executes `transfer_checked_with_fee` with the exact expected fee. The mint's configured maximum-fee cap still applies.
2. **Solana network fee — separate**. This is charged by the Solana runtime to the transaction fee payer. In the normal PowerPay checkout the buyer is the fee payer. It is not sent to the PowerPay treasury and is not treated as a PWRC fee.

The current PowerPay checkout adds no separate service fee.

## Quote binding

`buy_pwrc` now binds execution to the terms reviewed by the checkout. The instruction carries:

- SOL amount in lamports
- expected gross PWRC-per-SOL rate
- minimum acceptable net PWRC output
- expected PWRC Token-2022 fee basis points

Execution fails if the sale rate changes, the 2% fee policy changes, or net output falls below the signed minimum.

## Replay-resistant purchase receipts

Each checkout reference derives an immutable receipt PDA:

```text
PDA("purchase", reference)
```

The receipt is created atomically with settlement and records buyer, reference, SOL amount, gross PWRC, transfer fee, net PWRC and settlement slot. Because the PDA uses `init`, the same reference cannot settle twice.

The Solana Pay status endpoint reads this program-owned receipt instead of treating the presence of a reference key in an arbitrary transaction as proof of settlement.

## Upgrade boundary

The repository intentionally stays on `@coral-xyz/anchor` / `anchor-lang` / `anchor-spl` **0.32.1** for this release. That is the latest published `@coral-xyz/anchor` package line. Anchor 1.x is a breaking migration and renames the TypeScript client to `@anchor-lang/core`; it should be handled as a dedicated migration rather than mixed into the fee-program change.
