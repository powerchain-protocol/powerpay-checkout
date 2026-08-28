# PowerPay program security invariants

The PWRC sale program is designed to fail closed when settlement terms or canonical asset configuration differ from the reviewed checkout state.

## Toolchain boundary

Current repository program toolchain:

```text
Anchor CLI:              1.1.2
anchor-lang:             =1.1.2
anchor-spl:              =1.1.2
Anchor TypeScript client @anchor-lang/core@1.1.2
Solana CLI:              3.1.10
```

The legacy `@coral-xyz/anchor` TypeScript package is not part of the current workspace.

## Canonical asset

The sale accepts only:

```text
PWRC mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals:  9
Program:   Token-2022
Fee:       200 bps / 2%
```

Execution fails when the mint differs, uses the wrong token program, has the wrong decimals, lacks the expected transfer-fee extension, or has an active fee policy other than 200 bps.

## Fee semantics

A successful purchase has two separate protocol costs:

1. **PWRC Token-2022 transfer fee** — active policy must be 2%. The mint's current maximum-fee cap still applies.
2. **Solana network fee** — charged by the runtime to the transaction fee payer and not sent to the PowerPay treasury.

PowerPay currently adds **0% application checkout service fee**.

The program uses exact `transfer_checked_with_fee` semantics so an unexpected fee-policy change cannot silently settle under different terms.

## Atomic settlement

`buy_pwrc` performs the SOL and PWRC legs in one transaction:

```text
buyer SOL ───────────────► configured treasury
sale vault gross PWRC ───► buyer Token-2022 ATA
PurchaseReceipt PDA ─────► immutable purchase evidence
```

If any required instruction fails, Solana rolls back the transaction.

## Quote binding

The purchase instruction carries the values required to bind execution to the reviewed quote:

- SOL amount in lamports
- expected gross PWRC-per-SOL rate
- minimum acceptable net PWRC
- expected PWRC Token-2022 fee basis points

The program rejects settlement if the sale rate changes, the fee policy changes, or the computed net amount is below the signed minimum.

## Replay-resistant purchase receipt

Every order/reference derives a receipt PDA:

```text
PDA("purchase", reference)
```

The receipt is initialized atomically with settlement and records the purchase evidence needed for status verification. Because the account is created with `init`, the same reference cannot be settled twice.

The Solana Pay status path uses this program-owned receipt as settlement evidence instead of treating the appearance of a reference key in an arbitrary transaction as sufficient proof.

## Sale authority

The sale config controls:

- authority
- SOL treasury
- PWRC mint
- gross PWRC-per-SOL rate
- minimum purchase
- maximum purchase
- enabled state
- vault ownership boundary

Authority-only operations must not be exposed through public browser routes.

## Off-chain trust boundary

Pyth and Birdeye are reference data only. They may inform USD display, freshness, divergence, and reconciliation, but they cannot change the executable PWRC rate or bypass program checks.

## Upgrade safety

When the program binary changes:

1. rebuild and regenerate the IDL/types
2. ensure the web transaction builder matches the new instruction/account layout
3. run Anchor tests
4. test on devnet/staging
5. verify replay rejection and exact fee behavior
6. upgrade the deployed binary only with the intended upgrade authority
7. inspect bytecode/program id and sale config before enablement

If the deployed predecessor is Anchor 0.32.x and still has a legacy IDL account, complete [`ANCHOR_V1_MIGRATION.md`](ANCHOR_V1_MIGRATION.md) before the v1 upgrade.
