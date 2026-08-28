# PowerPay fee model

PowerPay keeps the three economically different fee layers explicit. The executable transaction never hides an application charge inside the PWRC/SOL rate or labels a treasury charge as a Solana network fee.

## Canonical PWRC mint

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

## Fee stack

| Fee | Canonical policy | Asset | Recipient / authority |
| --- | ---: | --- | --- |
| PowerPay service fee | **2% / 200 bps** | SOL | configured sale treasury |
| PWRC Token-2022 transfer fee | **2% / 200 bps** | PWRC | Token-2022 transfer-fee policy |
| Solana network fee | runtime-estimated | SOL | Solana runtime / validators |

### 1. PowerPay service fee

The service fee is calculated from the **base SOL purchase amount** and rounded up at lamport precision:

```text
service fee            = ceil(purchase lamports × 200 / 10,000)
total before network   = purchase lamports + service fee lamports
```

The service fee and base purchase are transferred atomically to the configured treasury inside `buy_pwrc`. PWRC output is calculated from the **base purchase amount**, not from the fee-inclusive SOL total.

The wallet also signs the expected 200 bps service-fee policy. If the client and deployed program disagree about that policy, the program fails closed.

### 2. PWRC Token-2022 transfer fee

The active PWRC fee schedule is evaluated for the current epoch. The exact token fee is bounded by the Token-2022 mint maximum-fee cap:

```text
PWRC fee = min(ceil(gross PWRC × 2%), active maximum fee)
net PWRC = gross PWRC - exact PWRC fee
```

PowerPay quotes gross, exact fee and net output before signing. The program re-reads the mint extension at execution time and uses checked-fee transfer semantics, so a fee-policy race cannot silently change the buyer's reviewed terms.

### 3. Solana network fee

The Solana runtime charges the transaction fee separately to the transaction fee payer. It is not part of the PowerPay treasury transfer and is not part of the Token-2022 PWRC fee. The signing wallet remains authoritative for the exact runtime estimate.

## Example

For a **0.50 SOL** base purchase:

```text
Base purchase                0.500000 SOL
PowerPay service fee (2%)    0.010000 SOL
Total before network fee     0.510000 SOL
Solana network fee           shown by signing wallet

Gross PWRC                   determined by on-chain sale rate
PWRC transfer fee (2%)       deducted under Token-2022 policy
Net PWRC                     delivered to buyer ATA
```

## Settlement authority

Pyth and Birdeye SOL/USD data are display/reference inputs only. They do not set the executable PWRC/SOL rate and they do not change fee authority. Settlement is governed by the deployed PowerPay program, SaleConfig, canonical mint, signed quote parameters and Solana runtime.
