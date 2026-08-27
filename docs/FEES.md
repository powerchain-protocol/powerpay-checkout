# PowerPay fee model

PowerPay separates three fee concepts so the checkout cannot blur protocol costs with application charges.

## Canonical PWRC mint

PowerPay accepts only the canonical Solana Token-2022 PWRC mint:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The Anchor program, quote service, checkout, send flow, and sale-administration script all fail closed when a different mint is supplied.

## 1. PWRC Token-2022 transfer fee — 2%

PWRC's active Token-2022 `TransferFeeConfig` must be **200 basis points (2%)**. The program reads the active epoch fee immediately before transfer and rejects a purchase or inventory withdrawal when the active basis-point value differs from 200.

The actual token fee is:

```text
min(gross PWRC × 2%, active Token-2022 maximum fee)
```

Token-2022 therefore may cap the absolute fee for sufficiently large transfers. PowerPay reads the current on-chain maximum and calculates the exact fee for the current epoch.

For sale execution, `transfer_checked_with_fee` is used so the expected fee is included in the instruction. A fee-policy change between quote construction and execution causes the transaction to fail rather than silently settling under different fee terms.

## 2. Solana network fee — separate

The Solana runtime charges the transaction fee to the transaction fee payer. In normal PowerPay checkout the buyer is the fee payer. This network fee is **in addition to** the SOL purchase amount and is not transferred to the PowerPay treasury by the sale program.

Wallets estimate/show this fee during signing because the exact network cost depends on the final transaction and current network conditions.

## 3. PowerPay checkout service fee — 0%

The current PowerPay Buy PWRC flow adds **no separate application checkout fee**. The checkout therefore exposes:

- SOL purchase amount
- gross PWRC
- 2% Token-2022 PWRC fee (subject to the on-chain maximum fee cap)
- net PWRC delivered
- separate Solana network fee estimated by the wallet

If a future PowerPay service fee is introduced, it must be modeled explicitly rather than hidden inside the PWRC rate or network fee.
