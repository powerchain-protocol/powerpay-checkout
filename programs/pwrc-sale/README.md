# PWRC Sale Program

Anchor 0.32.1 program used by PowerPay to exchange SOL for canonical PWRC Token-2022 atomically.

## Canonical mint + fee invariant

```text
PWRC mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals:  9
Token fee: 200 bps / 2% (Token-2022 TransferFeeConfig)
Network:   Solana fee is separate and paid by the transaction fee payer
```

The program fails closed if:

- a different mint is supplied,
- the mint is not owned by Token-2022,
- the mint does not use 9 decimals,
- the TransferFeeConfig extension is absent, or
- the active epoch transfer fee is not exactly 200 bps.

Token-2022 can cap the absolute transfer fee through its configured maximum fee. The program calculates the active epoch fee and passes the exact expected value to `transfer_checked_with_fee`, preventing silent fee-policy changes between review and execution.

## State

One config PDA uses seed `sale` and stores:

- authority
- SOL treasury
- canonical PWRC Token-2022 mint
- gross PWRC per SOL
- minimum / maximum lamports
- enabled state
- PDA bump

The config PDA also owns the associated PWRC sale-vault token account.

## Instructions

- `initialize_sale(rate, min_lamports, max_lamports)` — validates the canonical mint + 2% fee policy, then creates the disabled sale and Token-2022 vault.
- `update_sale(rate, min_lamports, max_lamports, enabled)` — authority-only rate/limit/pause control; re-validates the canonical mint + active 2% fee policy before updating/enabling.
- `buy_pwrc(lamports)` — buyer SOL to treasury plus vault PWRC to buyer ATA in one atomic invocation, using exact expected Token-2022 fee semantics.
- `withdraw_inventory(amount_raw)` — authority-only inventory withdrawal using exact expected Token-2022 fee semantics.

`buy_pwrc` also receives a read-only reference key. PowerPay puts a unique reference in each Solana Pay QR transaction so the checkout can discover the confirmed transaction without relying on an off-chain settlement record.

## Fee behavior

The buyer's SOL purchase amount and the Solana network fee are distinct:

```text
buyer wallet
  ├─ purchase amount ──► configured SOL treasury
  └─ network fee ──────► Solana runtime / fee mechanism

sale vault
  └─ gross PWRC ───────► buyer ATA
       └─ 2% Token-2022 transfer fee (subject to mint maximum-fee cap)
```

PowerPay itself currently adds no additional checkout service fee.
