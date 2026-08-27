# PWRC Sale Program

Anchor program used by PowerPay to exchange SOL for PWRC Token-2022 atomically.

## State

One config PDA uses seed `sale` and stores:

- authority
- SOL treasury
- PWRC Token-2022 mint
- gross PWRC per SOL
- minimum / maximum lamports
- enabled state
- PDA bump

The config PDA also owns the associated PWRC sale-vault token account.

## Instructions

- `initialize_sale(rate, min_lamports, max_lamports)` — creates the disabled sale and Token-2022 vault.
- `update_sale(rate, min_lamports, max_lamports, enabled)` — authority-only rate/limit/pause control.
- `buy_pwrc(lamports)` — buyer SOL to treasury plus vault PWRC to buyer ATA in one atomic invocation.
- `withdraw_inventory(amount_raw)` — authority-only inventory withdrawal.

`buy_pwrc` also receives a read-only reference key. PowerPay puts a unique reference in each Solana Pay QR transaction so the checkout can discover the confirmed transaction without relying on an off-chain settlement record.

## Token rules

The program explicitly requires the Token-2022 program and a 9-decimal mint. If the PWRC mint has the transfer-fee extension, the fee is enforced by Token-2022 on the vault → buyer transfer. The web quote endpoint reads the active fee schedule and shows gross/fee/net values.
