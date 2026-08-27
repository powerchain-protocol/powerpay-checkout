# PWRC Sale Program

PowerPay's atomic SOL → PWRC settlement program, migrated to **Anchor 1.1.2** / **Solana 3.1.10**. The Rust crates are pinned exactly to `anchor-lang = =1.1.2` and `anchor-spl = =1.1.2` so the Anchor v1 crate family cannot drift independently.

## Canonical mint + fee invariant

```text
PWRC mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals:  9
Token fee: 200 bps / 2% (Token-2022 TransferFeeConfig)
Network:   Solana fee is separate and paid by the transaction fee payer
Service:   PowerPay checkout service fee = 0%
```

The program fails closed if a different mint is supplied, the mint is not Token-2022, the mint does not use 9 decimals, `TransferFeeConfig` is absent, or the active epoch fee is not exactly 200 bps.

Token-2022 can cap the absolute fee through the mint's configured maximum fee. PowerPay calculates the active epoch fee and executes `transfer_checked_with_fee` with the exact expected fee, so a fee-policy race cannot silently change settlement terms.

## State

The `sale` PDA stores authority, SOL treasury, canonical PWRC mint, gross PWRC-per-SOL rate, min/max lamports, enabled state and PDA bump. The PDA owns the associated Token-2022 sale vault.

Each successful checkout also creates a single-use receipt PDA:

```text
PDA("purchase", reference)
```

The receipt records buyer, Solana Pay/order reference, lamports, gross PWRC, fee bps, exact fee, net PWRC, slot and bump. Reusing the same reference fails because the receipt is initialized once.

## Instructions

- `initialize_sale(rate, min_lamports, max_lamports)` — validates canonical mint + 2% fee policy and creates a disabled sale/vault.
- `update_sale(rate, min_lamports, max_lamports, enabled)` — authority-only controls; revalidates the canonical mint and fee policy before enabling.
- `buy_pwrc(lamports, expected_rate, min_net_pwrc_raw, expected_fee_bps)` — quote-bound atomic SOL/PWRC settlement plus immutable purchase receipt.
- `withdraw_inventory(amount_raw)` — authority-only inventory withdrawal using exact expected Token-2022 fee semantics.

## Fee behavior

```text
buyer wallet
  ├─ purchase amount ──► configured SOL treasury
  └─ Solana fee ───────► Solana runtime

sale vault
  └─ gross PWRC ───────► buyer Token-2022 ATA
       └─ 2% Token-2022 transfer fee
          (subject to mint maximum-fee cap)
```

The Solana fee is not a PowerPay treasury charge and is not included in the 2% PWRC fee.

## Anchor v1 migration

Anchor v1 changes CPI construction: `CpiContext::new` / `new_with_signer` receive the target **program ID** rather than the program's `AccountInfo`. This program uses `anchor_lang::system_program::ID` for SOL transfers and `anchor_spl::token_2022::ID` for Token-2022 CPIs.

If an already-deployed Anchor 0.32.x version has a legacy on-chain IDL account, close that legacy IDL account with the **0.32.1 CLI before deploying the Anchor v1 binary**. Anchor v1 removes the legacy IDL instructions and moves IDL storage to Program Metadata. See `docs/ANCHOR_V1_MIGRATION.md`.
